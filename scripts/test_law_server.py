import functools
import http.client
import json
import tempfile
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from law_repository import connect,add_source,now,get_source
from serve_laws import Handler

class ServerTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.database=self.root/"laws.sqlite";(self.root/"index.html").write_text("<h1>Portal fixture</h1>")
        with connect(self.database) as db:
            add_source(db,{"id":"fixture","jurisdiction":"TEST","citation":"Fixture § 1","heading":"Safety",
              "title_number":"1","identifier":"fixture","release":"test","source_url":"https://example.org",
              "archive_hash":"a"*64,"member":"fixture.xml","source_status":"fixture","notes":"","credit":"","imported_at":now()},
              "A building must have a safe exit.")
        self.server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Handler,database=self.database,directory=str(self.root)))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.host=f"127.0.0.1:{self.server.server_port}"
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();self.temp.cleanup()
    def request(self,method,path,value=None,origin=None,host=None):
        connection=http.client.HTTPConnection("127.0.0.1",self.server.server_port,timeout=5)
        headers={"Host":host or self.host}
        if origin:headers["Origin"]=origin
        if value is not None:headers["Content-Type"]="application/json"
        connection.request(method,path,body=json.dumps(value) if value is not None else None,headers=headers)
        response=connection.getresponse();raw=response.read();status=response.status;connection.close()
        return status,raw
    def test_search_source_and_history_route(self):
        status,raw=self.request("GET","/api/laws/search?q=safe")
        self.assertEqual(status,200);self.assertEqual(json.loads(raw)[0]["id"],"fixture")
        status,raw=self.request("GET","/law-explorer")
        self.assertEqual(status,200);self.assertIn(b"Portal fixture",raw)
        status,raw=self.request("GET","/api/laws/source?id=fixture")
        self.assertEqual(json.loads(raw)["body"],"A building must have a safe exit.")
    def test_cross_origin_write_and_unrecognized_host_rejected(self):
        value={"source_id":"fixture","proposed_text":"Changed transcription.","reason":"Source evidence"}
        self.assertEqual(self.request("POST","/api/laws/corrections",value,origin="https://other.example")[0],403)
        self.assertEqual(self.request("POST","/api/laws/corrections",value)[0],403)
        self.assertEqual(self.request("GET","/api/laws/stats",host="attacker.example")[0],403)
    def test_same_origin_correction_preserves_original(self):
        value={"source_id":"fixture","proposed_text":"A building must have two safe exits.","reason":"Source scan evidence, page 1."}
        status,raw=self.request("POST","/api/laws/corrections",value,origin="http://"+self.host)
        self.assertEqual(status,200);self.assertEqual(json.loads(raw)["status"],"pending")
        with connect(self.database) as db:
            self.assertEqual(get_source(db,"fixture")["body"],"A building must have a safe exit.")
    def test_uncollected_boundary_and_unknown_endpoint(self):
        self.assertEqual(self.request("GET","/api/laws/boundaries")[0],404)
        self.assertEqual(self.request("GET","/api/laws/not-an-endpoint")[0],404)
if __name__=="__main__":unittest.main()
