#!/usr/bin/env python3
"""Plain-text statutory repository. Standard library only; no legal equivalence inference."""
import argparse
import difflib
import hashlib
import json
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

def now():
    return datetime.now(timezone.utc).isoformat()

def connect(path):
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript("""
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS texts(hash TEXT PRIMARY KEY, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sources(
      id TEXT PRIMARY KEY, jurisdiction TEXT NOT NULL, citation TEXT NOT NULL,
      heading TEXT NOT NULL, title_number TEXT, identifier TEXT, release TEXT NOT NULL,
      source_url TEXT NOT NULL, archive_hash TEXT NOT NULL, member TEXT NOT NULL,
      text_hash TEXT NOT NULL REFERENCES texts(hash), source_status TEXT,
      notes TEXT NOT NULL, credit TEXT NOT NULL, imported_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS source_hash ON sources(text_hash);
    CREATE INDEX IF NOT EXISTS source_scope ON sources(jurisdiction,release,title_number);
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(id UNINDEXED,citation,heading,body);
    CREATE TABLE IF NOT EXISTS imports(
      id TEXT PRIMARY KEY,url TEXT NOT NULL,sha256 TEXT NOT NULL,sections INTEGER NOT NULL,at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS corrections(
      id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES sources(id),
      original_hash TEXT NOT NULL,proposed_text TEXT NOT NULL,reason TEXT NOT NULL,
      status TEXT NOT NULL,at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS agent_runs(
      id TEXT PRIMARY KEY,prompt TEXT NOT NULL,response TEXT NOT NULL,trace TEXT NOT NULL,at TEXT NOT NULL);
    """)
    from law_workflow import SCHEMA
    db.executescript(SCHEMA)
    return db

def add_source(db, source, body):
    """Idempotent append. A changed source under the same edition is an error."""
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    old = db.execute("SELECT text_hash FROM sources WHERE id=?", (source["id"],)).fetchone()
    if old:
        if old["text_hash"] != digest:
            raise ValueError("Source text changed under the same edition; import a new edition.")
        return False
    db.execute("INSERT OR IGNORE INTO texts VALUES (?,?)", (digest,body))
    columns = ["id","jurisdiction","citation","heading","title_number","identifier","release",
               "source_url","archive_hash","member","text_hash","source_status","notes","credit","imported_at"]
    source = dict(source, text_hash=digest)
    db.execute("INSERT INTO sources VALUES ("+",".join("?" for _ in columns)+")", [source.get(k,"") for k in columns])
    db.execute("INSERT INTO search_index VALUES (?,?,?,?)",(source["id"],source["citation"],source["heading"],body))
    return True

def get_source(db, source_id):
    row = db.execute("SELECT s.*,t.body FROM sources s JOIN texts t ON s.text_hash=t.hash WHERE s.id=?",(source_id,)).fetchone()
    if row is None:
        raise ValueError("Source reference not found.")
    return dict(row)

def search(db, query, limit=20, jurisdiction=None):
    words = re.findall(r"\w+", str(query), re.UNICODE)[:16]
    if not words:
        return []
    expression = " AND ".join('"'+word+'"' for word in words)
    sql = """SELECT s.id,s.citation,s.heading,s.jurisdiction,s.release,s.source_url,s.text_hash,
      snippet(search_index,3,'[',']',' … ',35) AS excerpt
      FROM search_index JOIN sources s ON s.id=search_index.id WHERE search_index MATCH ?"""
    params = [expression]
    if jurisdiction:
        sql += " AND s.jurisdiction=?"
        params.append(jurisdiction)
    sql += " ORDER BY bm25(search_index) LIMIT ?"
    params.append(max(1,min(100,int(limit))))
    return [dict(r) for r in db.execute(sql, params)]

def consolidated(db, limit=30):
    groups = db.execute("""SELECT t.hash,substr(t.body,1,250) AS excerpt,COUNT(*) AS occurrences
      FROM texts t JOIN sources s ON s.text_hash=t.hash WHERE t.body<>''
      GROUP BY t.hash HAVING COUNT(*)>1 ORDER BY COUNT(*) DESC,t.hash LIMIT ?""",
      (max(1,min(100,int(limit))),)).fetchall()
    return [dict(row, references=[dict(x) for x in db.execute(
        "SELECT id,citation,jurisdiction,release,source_url FROM sources WHERE text_hash=? ORDER BY citation",(row["hash"],))]) for row in groups]

def compare(db, first, second):
    a,b = get_source(db,first),get_source(db,second)
    return {"first":a,"second":b,"identical_text":a["text_hash"]==b["text_hash"],
      "legal_equivalence":"Not determined. Compare adoption, exceptions, definitions, scope and dates.",
      "diff":"\n".join(difflib.unified_diff(a["body"].splitlines(),b["body"].splitlines(),
         fromfile=a["citation"],tofile=b["citation"],lineterm=""))}

def propose_correction(db, source_id, proposed_text, reason):
    source = get_source(db,source_id)
    if not isinstance(proposed_text,str) or not proposed_text.strip() or len(proposed_text)>200000:
        raise ValueError("Correction text must contain 1–200,000 characters.")
    if not isinstance(reason,str) or len(reason.strip())<5 or len(reason)>4000:
        raise ValueError("Explain the correction in 5–4,000 characters.")
    if source["body"]==proposed_text:
        raise ValueError("The proposed text is unchanged.")
    request = {"id":str(uuid.uuid4()),"source_id":source_id,"original_hash":source["text_hash"],
      "proposed_text":proposed_text,"reason":reason.strip(),"status":"pending","at":now()}
    db.execute("INSERT INTO corrections VALUES (?,?,?,?,?,?,?)",tuple(request.values()))
    db.commit()
    return request

def stats(db):
    return {"source_records":db.execute("SELECT COUNT(*) FROM sources").fetchone()[0],
      "nonempty_records":db.execute("SELECT COUNT(*) FROM sources s JOIN texts t ON s.text_hash=t.hash WHERE t.body<>''").fetchone()[0],
      "unique_nonempty_texts":db.execute("SELECT COUNT(*) FROM texts WHERE body<>''").fetchone()[0],
      "jurisdictions":[dict(r) for r in db.execute("SELECT jurisdiction,COUNT(*) AS count FROM sources GROUP BY jurisdiction")],
      "titles":[dict(r) for r in db.execute("SELECT jurisdiction,title_number,COUNT(*) AS count FROM sources GROUP BY jurisdiction,title_number ORDER BY CAST(title_number AS INTEGER)")],
      "imports":[dict(r) for r in db.execute("SELECT * FROM imports ORDER BY id")],
      "pending_corrections":db.execute("SELECT COUNT(*) FROM corrections WHERE status='pending'").fetchone()[0],
      "coverage_note":"Only imported editions are searchable. Missing coverage means not collected, not no law.",
      "consolidation_policy":"Exact extracted text only. All source references retained. No legal equivalence inferred.",
      "transcription_status":"Machine extracted; individual provisions have not been independently verified."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--db",type=Path,required=True)
    p.add_argument("command",choices=["stats","search","get","consolidated","compare","correct"])
    p.add_argument("args",nargs="*")
    a=p.parse_args()
    if not a.db.is_file():
        p.error("Import sources first; database does not exist.")
    with connect(a.db) as db:
        if a.command=="stats": result=stats(db)
        elif a.command=="search": result=search(db," ".join(a.args))
        elif a.command=="get": result=get_source(db,a.args[0])
        elif a.command=="consolidated": result=consolidated(db)
        elif a.command=="compare": result=compare(db,*a.args)
        else:
            if len(a.args)!=3: p.error("correct requires SOURCE_ID TEXT_FILE REASON")
            result=propose_correction(db,a.args[0],Path(a.args[1]).read_text(),a.args[2])
        print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=="__main__": main()
