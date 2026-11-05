#!/usr/bin/env python3
"""Local-only review server for the compiled portal and corpus. Not an election backend."""
import argparse
import functools
import json
import os
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from law_repository import connect,search,get_source,compare,consolidated,stats,propose_correction
from law_agent import run_agent
from law_workflow import corrections,transcription,review_correction,amendment,list_amendments,create_amendment,revise_amendment

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,database=None,**kwargs):
        self.database=database
        super().__init__(*args,**kwargs)

    def valid_host(self):
        return self.headers.get("Host") in {f"127.0.0.1:{self.server.server_port}",f"localhost:{self.server.server_port}"}

    def respond(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status);self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store");self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(raw)));self.end_headers();self.wfile.write(raw)

    def do_GET(self):
        if not self.valid_host(): return self.respond(403,{"error":"Loopback host required."})
        parsed=urlparse(self.path)
        if parsed.path.startswith("/api/laws/"):
            try:
                q=parse_qs(parsed.query);get=lambda key: q.get(key,[""])[0]
                with connect(self.database) as db:
                    if parsed.path=="/api/laws/boundaries":
                        boundary=self.database.parent/"us-states.json"
                        if not boundary.is_file(): return self.respond(404,{"error":"Geographic boundaries have not been collected yet."})
                        result=json.loads(boundary.read_text())
                    elif parsed.path=="/api/laws/stats":
                        result=dict(stats(db),agent_configured=bool(os.environ.get("LAW_AGENT_MODEL")))
                    elif parsed.path=="/api/laws/search": result=search(db,get("q"),jurisdiction=get("jurisdiction") or None)
                    elif parsed.path=="/api/laws/source-checks":
                        audit_path=self.database.parent/"source-audit.json"
                        if audit_path.is_file():
                            audit=json.loads(audit_path.read_text())
                            result={k:v for k,v in audit.items() if k not in {"findings","checked_source_ids"}}
                            result["status"]="Checked for text fidelity" if get("source_id") in audit.get("checked_source_ids",[]) else "Not checked in available report"
                            result["source_findings"]=[r for r in audit.get("findings",[]) if r.get("source_id")==get("source_id")]
                        else: result={"kind":"Automated XML text-fidelity audit","status":"Not run","human_verification":"Not performed","legal_status":"Not assessed"}
                    elif parsed.path=="/api/laws/corrections": result=corrections(db,get("source_id") or None)
                    elif parsed.path=="/api/laws/transcription": result=transcription(db,get("source_id"))
                    elif parsed.path=="/api/laws/amendments": result=list_amendments(db,get("source_id") or None)
                    elif parsed.path=="/api/laws/amendment": result=amendment(db,get("id"),int(get("version")) if get("version") else None)
                    elif parsed.path=="/api/laws/source": result=get_source(db,get("id"))
                    elif parsed.path=="/api/laws/compare": result=compare(db,get("first"),get("second"))
                    elif parsed.path=="/api/laws/consolidated": result=consolidated(db)
                    else: return self.respond(404,{"error":"Unknown endpoint."})
                return self.respond(200,result)
            except (ValueError,KeyError) as error: return self.respond(400,{"error":str(error)})
        # SPA history routes fall back to index only if no filename extension.
        relative=parsed.path.lstrip("/")
        root=Path(self.directory).resolve();candidate=(root/relative).resolve()
        if not candidate.is_relative_to(root): return self.respond(403,{"error":"Invalid path."})
        if not candidate.exists() and not Path(relative).suffix:
            self.path="/index.html"
        return super().do_GET()

    def do_POST(self):
        if not self.valid_host(): return self.respond(403,{"error":"Loopback host required."})
        expected="http://"+self.headers.get("Host","")
        if self.headers.get("Origin")!=expected:
            return self.respond(403,{"error":"Same-origin request required."})
        if self.headers.get("Content-Type","").split(";")[0]!="application/json":
            return self.respond(415,{"error":"JSON required."})
        try:
            length=int(self.headers.get("Content-Length","0"))
            if not 1<=length<=900000: raise ValueError("Request size outside allowed range.")
            value=json.loads(self.rfile.read(length))
            if not isinstance(value,dict): raise ValueError("JSON object required.")
            with connect(self.database) as db:
                if self.path=="/api/laws/corrections":
                    result=propose_correction(db,value["source_id"],value["proposed_text"],value["reason"])
                elif self.path=="/api/laws/corrections/review":
                    result=review_correction(db,**value)
                elif self.path=="/api/laws/amendments":
                    result=create_amendment(db,**value)
                elif self.path=="/api/laws/amendments/revise":
                    result=revise_amendment(db,**value)
                elif self.path=="/api/laws/agent": result=run_agent(db,value["prompt"])
                else: return self.respond(404,{"error":"Unknown endpoint."})
            return self.respond(200,result)
        except (ValueError,KeyError,TypeError) as error: return self.respond(400,{"error":str(error)})
        except Exception: return self.respond(503,{"error":"The local model could not finish. Check that Ollama is running with the configured model."})

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--db",type=Path,required=True)
    p.add_argument("--dist",type=Path,default=Path("dist"));p.add_argument("--port",type=int,default=8765)
    a=p.parse_args()
    if not a.db.is_file() or not (a.dist/"index.html").is_file(): p.error("Import a corpus and run npm run build first.")
    server=ThreadingHTTPServer(("127.0.0.1",a.port),
      functools.partial(Handler,database=a.db.resolve(),directory=str(a.dist.resolve())))
    print(f"Local review portal: http://127.0.0.1:{a.port}",flush=True)
    server.serve_forever()
