#!/usr/bin/env python3
"""Resume by official title archive. Pin the release; retain original XML and notes."""
import argparse
from collections import Counter
import gzip
import hashlib
import io
import json
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from law_repository import connect,add_source,now,stats

RELEASE="119-136"
NS={"u":"http://xml.house.gov/schemas/uslm/1.0"}
SOURCE="https://uscode.house.gov/download.html"
def local(node): return node.tag.rsplit("}",1)[-1]
def text(node): return "" if node is None else "".join(node.itertext()).strip()
EXTRACTOR_VERSION="uslm-text-v2"
def extract_body(section):
    """Preserve node text and every inline tail; only layout whitespace is added."""
    output=[]
    blocks={"p","num","heading","chapeau","continuation","content","subsection",
      "paragraph","subparagraph","clause","subclause","item","subitem","table",
      "thead","tbody","tfoot","tr","td","th","br"}
    def walk(node):
        name=local(node)
        if name in {"notes","sourceCredit"}:return
        if name in blocks:output.append("\n\n")
        if node.text:output.append(node.text)
        for child in node:
            walk(child)
            if child.tail:output.append(child.tail)
        if name in blocks:output.append("\n\n")
    for child in section:
        if local(child) not in {"num","heading","notes","sourceCredit"}:walk(child)
    import re
    result="".join(output).strip()
    return re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+","\n\n",result)

def ensure_extractor(db):
    db.execute("CREATE TABLE IF NOT EXISTS corpus_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
    previous=db.execute("SELECT value FROM corpus_metadata WHERE key='extractor_version'").fetchone()
    if previous and previous["value"]!=EXTRACTOR_VERSION:
        raise ValueError("Different extraction version: rebuild into a separate output directory.")
    if not previous:
        if db.execute("SELECT COUNT(*) FROM imports").fetchone()[0]:
            raise ValueError("Legacy corpus preserved: use a new output directory for text-v2.")
        db.execute("INSERT INTO corpus_metadata VALUES ('extractor_version',?)",(EXTRACTOR_VERSION,))
    db.commit()

def ingest_archive(db, raw, archive_name, url, release=RELEASE):
    ensure_extractor(db)
    archive_hash=hashlib.sha256(raw).hexdigest()
    import_id=release+":"+archive_name
    old=db.execute("SELECT * FROM imports WHERE id=?",(import_id,)).fetchone()
    if old:
        if old["sha256"]!=archive_hash: raise ValueError("Pinned official archive changed; review before reimport.")
        return dict(old)
    count=0
    with db:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            for member in archive.namelist():
                if not member.lower().endswith(".xml"): continue
                if archive.getinfo(member).file_size>600*1024*1024: raise ValueError("XML member too large.")
                root=ET.fromstring(archive.read(member)); main=root.find("u:main",NS)
                if main is None: continue
                title=main.find(".//u:title/u:num",NS)
                title_number=title.get("value",archive_name) if title is not None else archive_name
                parents={child:parent for parent in main.iter() for child in parent}
                def structural(section):
                    parent=parents.get(section)
                    while parent is not None and parent is not main:
                        if local(parent) in {"section","notes","sourceCredit","quotedContent"}: return False
                        parent=parents.get(parent)
                    return True
                sections=[s for s in main.findall(".//u:section",NS) if s.get("identifier") and structural(s)]
                occurrences=Counter(s.get("identifier") for s in sections)
                ordinal=Counter()
                for section in sections:
                    identifier=section.get("identifier")
                    if not identifier: continue
                    num=section.find("u:num",NS)
                    number=num.get("value",text(num)) if num is not None else identifier.rsplit("/",1)[-1]
                    ordinal[identifier]+=1
                    suffix=("#"+section.get("id","occurrence-"+str(ordinal[identifier]))) if occurrences[identifier]>1 else ""
                    status=section.get("status","Unspecified in source attribute")
                    if suffix: status+="; multiple source occurrences share this section identifier; inspect original XML"
                    record={"id":"uscode:"+release+":"+identifier+suffix,"jurisdiction":"US-FEDERAL",
                      "citation":title_number+" U.S.C. § "+number,"heading":text(section.find("u:heading",NS)),
                      "title_number":title_number,"identifier":identifier,"release":release,
                      "source_url":url,
                      "archive_hash":archive_hash,"member":member,
                      "source_status":status,
                      "notes":"\n\n".join(text(n) for n in section.findall("u:notes",NS)),
                      "credit":text(section.find("u:sourceCredit",NS)),"imported_at":now()}
                    add_source(db,record,extract_body(section));count+=1
        db.execute("INSERT INTO imports VALUES (?,?,?,?,?)",(import_id,url,archive_hash,count,now()))
    return {"id":import_id,"sections":count,"sha256":archive_hash}

def collect(output,titles,source_cache=None):
    output.mkdir(parents=True,exist_ok=True); originals=output/"originals";originals.mkdir(exist_ok=True)
    with connect(output/"laws.sqlite") as db:
        for title in titles:
            # Standard titles 1–54, except reserved Title 53. Appendices imported explicitly.
            if title=="53": continue
            label=title.zfill(2) if title.isdigit() else title
            name="xml_usc"+label+"@"+RELEASE+".zip"
            url="https://uscode.house.gov/download/releasepoints/us/pl/119/136/"+name.replace("@","%40")
            archive=originals/name
            if not archive.exists() and source_cache is not None:
                import shutil
                cached=source_cache/name
                manifest=json.loads((source_cache.parent/"manifest.json").read_text())
                reference=next((row for row in manifest["imports"] if row["id"]==RELEASE+":"+name),None)
                if not reference or not cached.is_file() or hashlib.sha256(cached.read_bytes()).hexdigest()!=reference["sha256"]:
                    raise ValueError("Cached official archive is absent or its recorded hash differs.")
                shutil.copy2(cached,archive)
            if not archive.exists():
                request=urllib.request.Request(url,headers={"User-Agent":"DigitalDemocracyResearch/0.1"})
                with urllib.request.urlopen(request,timeout=90) as response:
                    raw=response.read(150*1024*1024+1)
                if len(raw)>150*1024*1024: raise ValueError("Archive download exceeded limit.")
                # Validate before installing cached bytes.
                with zipfile.ZipFile(io.BytesIO(raw)) as z:
                    if z.testzip(): raise ValueError("Archive checksum failed.")
                archive.write_bytes(raw)
            result=ingest_archive(db,archive.read_bytes(),name,url)
            manifest=dict(stats(db),extractor_version=EXTRACTOR_VERSION,release_point=RELEASE,official_catalog=SOURCE,
              scope="Imported U.S. Code title archives only; not all federal, state, local or world law.",
              effective_date_policy="Unknown per provision; release point is not an effective date.",
              notes_policy="Notes and credits retained separately. Some notes contain enacted provisions; search currently indexes section bodies only.")
            (output/"manifest.json").write_text(json.dumps(manifest,indent=2))
            print(json.dumps(result),flush=True)

def export(output):
    with connect(output/"laws.sqlite") as db, gzip.open(output/"statutes.jsonl.gz","wt",encoding="utf-8") as target:
        for row in db.execute("SELECT s.*,t.body FROM sources s JOIN texts t ON s.text_hash=t.hash ORDER BY s.id"):
            target.write(json.dumps(dict(row),ensure_ascii=False)+"\n")

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,required=True)
    p.add_argument("--titles",nargs="+",default=["1"])
    p.add_argument("--export",action="store_true")
    p.add_argument("--source-cache",type=Path)
    a=p.parse_args();collect(a.output,a.titles,a.source_cache)
    if a.export: export(a.output)
