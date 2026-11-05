#!/usr/bin/env python3
import argparse,hashlib,json,sqlite3,zipfile
from pathlib import Path
from law_repository import connect,stats
def verify(corpus):
    with connect(corpus/"laws.sqlite") as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0]=="ok"
        assert not db.execute("PRAGMA foreign_key_check").fetchall()
        records=db.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
        assert records==db.execute("SELECT COUNT(*) FROM search_index").fetchone()[0]
        for row in db.execute("SELECT hash,body FROM texts"):
            assert hashlib.sha256(row["body"].encode()).hexdigest()==row["hash"]
        for row in db.execute("SELECT * FROM imports"):
            archive=corpus/"originals"/row["id"].split(":",1)[1]
            assert hashlib.sha256(archive.read_bytes()).hexdigest()==row["sha256"]
            with zipfile.ZipFile(archive) as z: assert z.testzip() is None
        report={"integrity":"passed","source_records":records,"imported_archives":len(stats(db)["imports"])}
        (corpus/"verification.json").write_text(json.dumps(report,indent=2))
        print(json.dumps(report))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--corpus",type=Path,required=True);a=p.parse_args();verify(a.corpus)
