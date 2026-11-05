"""Local review overlays and source-anchored amendment drafts; never enactment."""
import difflib
import uuid
from law_repository import get_source,now
SCHEMA="""
CREATE TABLE IF NOT EXISTS correction_reviews(
 id TEXT PRIMARY KEY,correction_id TEXT NOT NULL REFERENCES corrections(id),
 decision TEXT NOT NULL,reviewer TEXT NOT NULL,reason TEXT NOT NULL,supersedes TEXT,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS transcription_heads(
 source_id TEXT PRIMARY KEY REFERENCES sources(id),correction_id TEXT NOT NULL REFERENCES corrections(id),
 review_id TEXT NOT NULL REFERENCES correction_reviews(id));
CREATE TABLE IF NOT EXISTS amendments(
 id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES sources(id),original_hash TEXT NOT NULL,
 start_offset INTEGER NOT NULL,end_offset INTEGER NOT NULL,original_excerpt TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS amendment_versions(
 amendment_id TEXT NOT NULL REFERENCES amendments(id),version INTEGER NOT NULL,
 title TEXT NOT NULL,replacement TEXT NOT NULL,reason TEXT NOT NULL,at TEXT NOT NULL,
 PRIMARY KEY(amendment_id,version));
"""
def short_text(value,field,minimum,maximum):
    if not isinstance(value,str) or not minimum<=len(value.strip())<=maximum:
        raise ValueError(f"{field} must contain {minimum}–{maximum} characters.")
    return value.strip()
def head(db,source_id):
    row=db.execute("SELECT correction_id FROM transcription_heads WHERE source_id=?",(source_id,)).fetchone()
    return row["correction_id"] if row else ""
def corrections(db,source_id=None):
    sql="SELECT c.*,s.citation FROM corrections c JOIN sources s ON s.id=c.source_id";args=[]
    if source_id:sql+=" WHERE c.source_id=?";args.append(source_id)
    sql+=" ORDER BY c.at DESC,c.id LIMIT 100"
    return [dict(row,review_head=head(db,row["source_id"])) for row in db.execute(sql,args)]
def transcription(db,source_id):
    source=get_source(db,source_id)
    current=db.execute("""SELECT c.*,r.reviewer,r.reason AS review_reason,r.at AS reviewed_at
      FROM transcription_heads h JOIN corrections c ON c.id=h.correction_id
      JOIN correction_reviews r ON r.id=h.review_id WHERE h.source_id=?""",(source_id,)).fetchone()
    history=[dict(row) for row in db.execute("""SELECT r.* FROM correction_reviews r
      JOIN corrections c ON c.id=r.correction_id WHERE c.source_id=? ORDER BY r.at,r.id""",(source_id,))]
    return {"source_id":source_id,"original_hash":source["text_hash"],"original_text":source["body"],
      "review_head":head(db,source_id),"accepted":dict(current) if current else None,"history":history,
      "notice":"Local reviewer decisions are self-reported, not authenticated legal certification. Official source text remains unchanged."}
def review_correction(db,correction_id,decision,reviewer,reason,expected_head,confirmed):
    if decision not in {"accepted","rejected"}:raise ValueError("Choose accepted or rejected.")
    reviewer=short_text(reviewer,"Reviewer label",2,100);reason=short_text(reason,"Review evidence/reason",10,4000)
    if confirmed is not True:raise ValueError("Confirm you checked the correction against the original source.")
    if not isinstance(expected_head,str):raise ValueError("A review-head token is required.")
    with db:
        db.execute("BEGIN IMMEDIATE")
        request=db.execute("SELECT * FROM corrections WHERE id=?",(correction_id,)).fetchone()
        if not request:raise ValueError("Correction not found.")
        if request["status"]!="pending":raise ValueError("This correction was already reviewed. Reload the queue.")
        source=get_source(db,request["source_id"])
        if source["text_hash"]!=request["original_hash"]:raise ValueError("Source hash changed; start a new correction.")
        previous=head(db,source["id"])
        if previous!=expected_head:raise ValueError("Another transcription was accepted. Reload before reviewing.")
        review={"id":str(uuid.uuid4()),"correction_id":correction_id,"decision":decision,
          "reviewer":reviewer,"reason":reason,"supersedes":previous or None,"at":now()}
        db.execute("INSERT INTO correction_reviews VALUES (?,?,?,?,?,?,?)",tuple(review.values()))
        db.execute("UPDATE corrections SET status=? WHERE id=?",(decision,correction_id))
        if decision=="accepted":
            db.execute("INSERT OR REPLACE INTO transcription_heads VALUES (?,?,?)",(source["id"],correction_id,review["id"]))
    return transcription(db,source["id"])
def amendment(db,amendment_id,version=None):
    record=db.execute("SELECT * FROM amendments WHERE id=?",(amendment_id,)).fetchone()
    if not record:raise ValueError("Amendment draft not found.")
    versions=[dict(row) for row in db.execute("SELECT * FROM amendment_versions WHERE amendment_id=? ORDER BY version",(amendment_id,))]
    if version is None:selected=versions[-1]
    else:
        selected=next((r for r in versions if r["version"]==version),None)
        if selected is None:raise ValueError("Amendment version not found.")
    source=get_source(db,record["source_id"])
    return dict(record,**{k:v for k,v in selected.items() if k!="amendment_id"},
      citation=source["citation"],release=source["release"],jurisdiction=source["jurisdiction"],
      source_url=source["source_url"],versions=versions,latest_version=versions[-1]["version"],
      status="Draft only — not enacted",
      diff="\n".join(difflib.unified_diff(record["original_excerpt"].splitlines(),selected["replacement"].splitlines(),
        fromfile=source["citation"]+" original selection",tofile="Proposed replacement",lineterm="")))
def amendment_values(title,replacement,reason):
    title=short_text(title,"Title",5,160);reason=short_text(reason,"Amendment reason",10,4000)
    if not isinstance(replacement,str) or len(replacement)>200000:raise ValueError("Replacement must be text up to 200,000 characters; empty means deletion.")
    return title,replacement,reason
def create_amendment(db,source_id,original_hash,start_offset,end_offset,title,replacement,reason):
    title,replacement,reason=amendment_values(title,replacement,reason);source=get_source(db,source_id)
    if source["text_hash"]!=original_hash:raise ValueError("The source snapshot changed. Reload before drafting.")
    if type(start_offset) is not int or type(end_offset) is not int or not 0<=start_offset<end_offset<=len(source["body"]):
        raise ValueError("Select a valid nonempty range from the original statutory body.")
    excerpt=source["body"][start_offset:end_offset]
    if not excerpt.strip() or len(excerpt)>200000:raise ValueError("Select substantive text up to 200,000 characters.")
    if excerpt==replacement:raise ValueError("Change the wording before creating an amendment.")
    identity=str(uuid.uuid4())
    with db:
        db.execute("INSERT INTO amendments VALUES (?,?,?,?,?,?,?)",(identity,source_id,original_hash,start_offset,end_offset,excerpt,now()))
        db.execute("INSERT INTO amendment_versions VALUES (?,?,?,?,?,?)",(identity,1,title,replacement,reason,now()))
    return amendment(db,identity)
def revise_amendment(db,amendment_id,expected_version,title,replacement,reason):
    title,replacement,reason=amendment_values(title,replacement,reason)
    if type(expected_version) is not int:raise ValueError("An integer version token is required.")
    with db:
        db.execute("BEGIN IMMEDIATE");current=amendment(db,amendment_id)
        if current["version"]!=expected_version:raise ValueError("This draft changed elsewhere. Reload before saving.")
        if (title,replacement,reason)==(current["title"],current["replacement"],current["reason"]):raise ValueError("The draft is unchanged.")
        if replacement==current["original_excerpt"]:raise ValueError("An amendment must change the original selection.")
        db.execute("INSERT INTO amendment_versions VALUES (?,?,?,?,?,?)",(amendment_id,expected_version+1,title,replacement,reason,now()))
    return amendment(db,amendment_id)
def list_amendments(db,source_id=None):
    sql="SELECT id FROM amendments";args=[]
    if source_id:sql+=" WHERE source_id=?";args.append(source_id)
    sql+=" ORDER BY at DESC,id LIMIT 100"
    return [amendment(db,row["id"]) for row in db.execute(sql,args)]
