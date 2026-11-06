import tempfile
import unittest
from pathlib import Path
from law_repository import connect,add_source,get_source,propose_correction,now
from law_workflow import transcription,review_correction,create_amendment,revise_amendment,amendment,corrections
class WorkflowTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.db=connect(Path(self.temp.name)/"fixture.sqlite")
        self.body="A safe building must have an exit. A second clause follows."
        add_source(self.db,{"id":"fixture","jurisdiction":"TEST","citation":"Fixture § 1","heading":"Safety",
          "title_number":"1","identifier":"fixture","release":"test","source_url":"https://example.org/official",
          "archive_hash":"a"*64,"member":"fixture.xml","source_status":"fixture","notes":"","credit":"","imported_at":now()},self.body)
        self.db.commit();self.source=get_source(self.db,"fixture")
    def tearDown(self):
        self.db.close();self.temp.cleanup()
    def proposed(self,text):
        return propose_correction(self.db,"fixture",text,"Fixture evidence from original source.")
    def review(self,item,decision="accepted",expected_head=""):
        return review_correction(self.db,item["id"],decision,"Fixture reviewer","Compared fixture against original source.",expected_head,True)
    def test_accepted_transcription_is_an_overlay_with_auditable_supersession(self):
        a=self.proposed("First corrected transcription.")
        b=self.proposed("Second corrected transcription.")
        result=self.review(a)
        self.assertEqual(result["accepted"]["proposed_text"],a["proposed_text"])
        self.assertEqual(result["review_head"],a["id"])
        with self.assertRaisesRegex(ValueError,"Another transcription"):self.review(b)
        self.review(b,expected_head=a["id"])
        result=transcription(self.db,"fixture")
        self.assertEqual(result["accepted"]["id"],b["id"])
        self.assertEqual(result["history"][-1]["supersedes"],a["id"])
        self.assertEqual(get_source(self.db,"fixture"),self.source)
        with self.assertRaisesRegex(ValueError,"already reviewed"):self.review(a)
    def test_rejection_and_confirmation_do_not_rewrite_source(self):
        item=self.proposed("A proposed transcription.")
        with self.assertRaises(ValueError):review_correction(self.db,item["id"],"accepted","Fixture","Evidence checked against source.","",False)
        self.assertEqual(corrections(self.db)[0]["status"],"pending")
        result=self.review(item,"rejected")
        self.assertIsNone(result["accepted"]);self.assertEqual(len(result["history"]),1)
        self.assertEqual(get_source(self.db,"fixture"),self.source)
    def create(self,replacement="a safe emergency exit"):
        start=self.body.index("an exit")
        return create_amendment(self.db,"fixture",self.source["text_hash"],start,start+len("an exit"),
          "Amend fixture exit wording",replacement,"Clarify the fixture requirement for a review test.")
    def test_amendment_versions_preserve_target_and_do_not_enact(self):
        first=self.create();self.assertEqual(first["original_excerpt"],"an exit")
        second=revise_amendment(self.db,first["id"],1,first["title"],"two safe exits",first["reason"])
        self.assertEqual(second["version"],2);self.assertEqual(second["latest_version"],2)
        self.assertEqual(amendment(self.db,first["id"],1)["replacement"],"a safe emergency exit")
        self.assertEqual(second["original_hash"],self.source["text_hash"])
        with self.assertRaisesRegex(ValueError,"changed elsewhere"):revise_amendment(self.db,first["id"],1,first["title"],"three exits",first["reason"])
        self.assertEqual(get_source(self.db,"fixture"),self.source)
        self.assertIn("not enacted",second["status"])
    def test_deletion_supported_and_stale_or_invalid_anchors_rejected(self):
        deleted=self.create("");self.assertEqual(deleted["replacement"],"")
        with self.assertRaises(ValueError):create_amendment(self.db,"fixture","wrong",0,1,"Valid title","x","Sufficient reason.")
        for start,end in [(True,3),(-1,3),(0,999),(3,3)]:
            with self.assertRaises(ValueError):create_amendment(self.db,"fixture",self.source["text_hash"],start,end,"Valid title","x","Sufficient reason.")
        with self.assertRaises(ValueError):amendment(self.db,deleted["id"],99)
    def test_unicode_offsets_are_code_points(self):
        body="😀 Résumé: retain human authority."
        add_source(self.db,dict(self.source,id="unicode",text_hash=None),body);self.db.commit()
        record=get_source(self.db,"unicode");start=body.index("human")
        result=create_amendment(self.db,"unicode",record["text_hash"],start,start+5,"Amend authority wording","citizen","Fixture Unicode range preservation.")
        self.assertEqual(result["original_excerpt"],"human")
if __name__=="__main__":unittest.main()
