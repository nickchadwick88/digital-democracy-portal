import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from law_repository import connect,add_source,get_source,search,compare,consolidated,propose_correction,stats,now
from collect_uscode import ingest_archive
from law_agent import run_agent,execute

class RepositoryTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.db=connect(Path(self.tmp.name)/"laws.sqlite")
        self.source={"id":"test:a","jurisdiction":"TEST-A","citation":"Fixture § 1","heading":"Building safety",
          "title_number":"1","identifier":"fixture1","release":"fixture-v1","source_url":"https://example.org/source",
          "archive_hash":"f"*64,"member":"fixture.xml","source_status":"fixture","notes":"","credit":"","imported_at":now()}
        add_source(self.db,self.source,"A safe building must have an exit.")
        add_source(self.db,dict(self.source,id="test:b",jurisdiction="TEST-B"),"A safe building must have an exit.")
        self.db.commit()
    def tearDown(self):
        self.db.close();self.tmp.cleanup()
    def test_search_and_consolidation_preserve_both_jurisdictions(self):
        self.assertEqual(len(search(self.db,"safe exit")),2)
        self.assertEqual(len(search(self.db,"safe",jurisdiction="TEST-A")),1)
        groups=consolidated(self.db)
        self.assertEqual(len(groups),1)
        self.assertEqual(groups[0]["occurrences"],2)
        self.assertEqual({r["jurisdiction"] for r in groups[0]["references"]},{"TEST-A","TEST-B"})
        self.assertTrue(compare(self.db,"test:a","test:b")["identical_text"])
        self.assertEqual(stats(self.db)["unique_nonempty_texts"],1)
    def test_correction_is_pending_and_never_rewrites_source(self):
        before=get_source(self.db,"test:a")
        result=propose_correction(self.db,"test:a","A safe building must have two exits.","Verify against original scan, page 1.")
        self.assertEqual(result["status"],"pending")
        self.assertEqual(result["original_hash"],before["text_hash"])
        self.assertEqual(get_source(self.db,"test:a"),before)
        with self.assertRaises(ValueError): propose_correction(self.db,"missing","Some text","Valid reason")
    def test_same_edition_cannot_silently_change(self):
        with self.assertRaises(ValueError): add_source(self.db,self.source,"Changed wording.")
        self.assertFalse(add_source(self.db,self.source,"A safe building must have an exit."))
        self.assertEqual(len(search(self.db,'safe OR " DROP TABLE sources; --')),0)
    def test_official_xml_extraction_and_restart(self):
        xml=b'''<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0"><main><title><num value="1"/><section identifier="/us/usc/t1/s99"><num value="99">99</num><heading>Test heading</heading><content><p>Read <ref>section 2</ref> before acting.</p></content><sourceCredit>Credit</sourceCredit><notes><note>Note retained.</note></notes></section></title></main></uscDoc>'''
        buff=io.BytesIO()
        with zipfile.ZipFile(buff,"w") as z:z.writestr("usc01.xml",xml)
        raw=buff.getvalue()
        ingest_archive(self.db,raw,"fixture.zip","https://example.org/fixture.zip",release="fixture")
        result=get_source(self.db,"uscode:fixture:/us/usc/t1/s99")
        self.assertEqual(result["body"],"Read section 2 before acting.")
        self.assertEqual(result["notes"],"Note retained.")
        self.assertEqual(result["credit"],"Credit")
        self.assertEqual(result["source_url"],"https://example.org/fixture.zip")
        count=stats(self.db)["source_records"]
        ingest_archive(self.db,raw,"fixture.zip","https://example.org/fixture.zip",release="fixture")
        self.assertEqual(stats(self.db)["source_records"],count)
    def test_duplicate_statute_numbers_keep_separate_source_occurrences(self):
        xml=b'''<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0"><main><title><num value="5"/><section id="first" identifier="/us/usc/t5/s3598"><num value="3598"/><heading>Duplicate number A</heading><content><p>First separately enacted text.</p></content><notes><section identifier="/us/usc/t5/s999"><content><p>Quoted note, not another codified section.</p></content></section></notes></section><section id="second" identifier="/us/usc/t5/s3598"><num value="3598"/><heading>Duplicate number B</heading><content><p>Second separately enacted text.</p></content></section></title></main></uscDoc>'''
        buff=io.BytesIO()
        with zipfile.ZipFile(buff,"w") as z:z.writestr("usc05.xml",xml)
        ingest_archive(self.db,buff.getvalue(),"duplicate.zip","https://example.org/duplicate.zip",release="fixture")
        a=get_source(self.db,"uscode:fixture:/us/usc/t5/s3598#first")
        b=get_source(self.db,"uscode:fixture:/us/usc/t5/s3598#second")
        self.assertNotEqual(a["text_hash"],b["text_hash"])
        self.assertEqual(a["citation"],b["citation"])
        with self.assertRaises(ValueError):get_source(self.db,"uscode:fixture:/us/usc/t5/s999")
    def test_agent_uses_tools_and_saves_trace_without_source_writes(self):
        replies=iter([
          {"role":"assistant","content":"","tool_calls":[{"function":{"name":"search","arguments":{"query":"safe exit"}}}]},
          {"role":"assistant","content":"Fixture § 1 (test:a) contains an exit requirement. Verify the source."}])
        before=get_source(self.db,"test:a")
        result=run_agent(self.db,"Find exit requirements",model="fixture",client=lambda *_:next(replies))
        self.assertEqual([r["tool"] for r in result["trace"]],["coverage","search"])
        self.assertEqual(get_source(self.db,"test:a"),before)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM agent_runs").fetchone()[0],1)
        with self.assertRaises(ValueError): execute(self.db,"shell",{"command":"rm -rf /"})
        with self.assertRaises(ValueError): execute(self.db,"search",{"query":"exit","sql":"DROP TABLE sources"})
    def test_agent_budget_and_configuration(self):
        with self.assertRaises(ValueError):run_agent(self.db,"question",model="",client=lambda *_:{})
        reply={"role":"assistant","tool_calls":[{"function":{"name":"coverage","arguments":{}}}]}
        with self.assertRaisesRegex(ValueError,"step budget"):run_agent(self.db,"question",model="fixture",client=lambda *_:reply)
if __name__=="__main__":unittest.main()
