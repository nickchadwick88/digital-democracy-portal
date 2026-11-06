#!/usr/bin/env python3
"""Independent text-fidelity check against retained XML; not legal or human verification."""
import argparse
import copy
import hashlib
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from law_repository import connect
NS={"u":"http://xml.house.gov/schemas/uslm/1.0"}
def local(node):return node.tag.rsplit("}",1)[-1]
def expected_text(section):
    clean=copy.deepcopy(section)
    for parent in list(clean.iter()):
        for child in list(parent):
            if local(child) in {"notes","sourceCredit"}:
                siblings=list(parent);index=siblings.index(child);tail=child.tail or ""
                if index: siblings[index-1].tail=(siblings[index-1].tail or "")+tail
                else: parent.text=(parent.text or "")+tail
                parent.remove(child)
    return "".join("".join(child.itertext()) for child in clean if local(child) not in {"num","heading"})
def normalized(value):return "".join(value.split())
def inspect_xml(raw,rows):
    root=ET.fromstring(raw);parents={c:p for p in root.iter() for c in p};sections={}
    for section in root.findall(".//u:main//u:section",NS):
        identifier=section.get("identifier")
        if not identifier:continue
        parent=parents.get(section);nested=False
        while parent is not None:
            if local(parent) in {"notes","sourceCredit","section","quotedContent"}:nested=True;break
            parent=parents.get(parent)
        if not nested:sections.setdefault(identifier,[]).append(section)
    findings=[];matched=0
    for row in rows:
        candidates=sections.get(row["identifier"],[])
        if "#" in row["id"]:
            xml_id=row["id"].split("#",1)[1];candidates=[s for s in candidates if s.get("id")==xml_id]
        if len(candidates)!=1:
            findings.append({"source_id":row["id"],"issue":"Source XML occurrence is missing or ambiguous."});continue
        expected=expected_text(candidates[0])
        if normalized(expected)!=normalized(row["body"]):
            findings.append({"source_id":row["id"],"citation":row["citation"],"issue":"Extracted body differs from independently flattened source body; inspect mixed content/tables/formatting.",
              "expected_characters":len(normalized(expected)),"extracted_characters":len(normalized(row["body"]))})
        else:matched+=1
    return matched,findings
def audit(corpus):
    findings=[];matched=0;archive_failures=[];count=0;checked=[]
    with connect(corpus/"laws.sqlite") as db:
        archives=list(db.execute("SELECT * FROM imports ORDER BY id"))
        for record in archives:
            path=corpus/"originals"/record["id"].split(":",1)[1]
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=record["sha256"]:
                archive_failures.append(record["id"]);continue
            with zipfile.ZipFile(path) as archive:
                for member in archive.namelist():
                    if not member.endswith(".xml"):continue
                    rows=[dict(r) for r in db.execute("""SELECT s.*,t.body FROM sources s JOIN texts t ON t.hash=s.text_hash
                      WHERE s.archive_hash=? AND s.member=?""",(record["sha256"],member))]
                    success,issues=inspect_xml(archive.read(member),rows)
                    count+=len(rows);matched+=success;findings.extend(issues);checked.extend(r['id'] for r in rows)
        report={"kind":"Automated XML text-fidelity audit","source_records_checked":count,"matching_records":matched,
          "flagged_records":len(findings),"archive_failures":archive_failures,"findings":findings,
          "checked_source_ids":checked,"legal_status":"Not assessed","human_verification":"Not performed",
          "notice":"Whitespace-insensitive text consistency only. Does not establish legal force, effective dates, table layout, notation meaning or independent proofreading."}
        (corpus/"source-audit.json").write_text(json.dumps(report,indent=2))
        print(json.dumps({k:v for k,v in report.items() if k not in {"findings","checked_source_ids"}}))
    return report
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--corpus",type=Path,required=True);a=p.parse_args();audit(a.corpus)
