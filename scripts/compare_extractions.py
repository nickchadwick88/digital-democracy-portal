#!/usr/bin/env python3
"""Compare immutable extraction snapshots without modifying either database."""
import argparse,json,sqlite3
from pathlib import Path
def normalized(value):return "".join(value.split())
def compare(old,new):
    a=sqlite3.connect(old/"laws.sqlite");b=sqlite3.connect(new/"laws.sqlite")
    previous={r[0]:(r[1],r[2]) for r in a.execute("SELECT s.id,s.text_hash,t.body FROM sources s JOIN texts t ON s.text_hash=t.hash")}
    counters={"source_records":0,"unchanged_bodies":0,"format_only_changes":0,"text_changes":0}
    missing=[];changed=[]
    for identity,digest,body in b.execute("SELECT s.id,s.text_hash,t.body FROM sources s JOIN texts t ON s.text_hash=t.hash"):
        counters["source_records"]+=1
        if identity not in previous:missing.append(identity);continue
        old_hash,old_body=previous.pop(identity)
        if digest==old_hash:counters["unchanged_bodies"]+=1
        elif normalized(body)==normalized(old_body):counters["format_only_changes"]+=1
        else:
            counters["text_changes"]+=1
            changed.append({"source_id":identity,"old_hash":old_hash,"new_hash":digest,"old_characters":len(old_body),"new_characters":len(body)})
    report=dict(counters,missing_from_old=missing,missing_from_new=list(previous),changed_sources=changed,
      notice="Separate extraction snapshots of the same retained official archives. Prior corpus and annotations are not overwritten. Text agreement is not legal certification.")
    (new/"rebuild-report.json").write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!="changed_sources"}))
    a.close();b.close()
    if missing or previous:raise ValueError("Source identity set changed; inspect before adopting new extraction.")
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--old",type=Path,required=True);p.add_argument("--new",type=Path,required=True);args=p.parse_args();compare(args.old,args.new)
