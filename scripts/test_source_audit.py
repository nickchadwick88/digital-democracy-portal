import unittest
from audit_source_text import inspect_xml
class AuditTest(unittest.TestCase):
    def test_independent_check_flags_dropped_mixed_content_and_preserves_inline_words(self):
        xml=b'''<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0"><main><title><section identifier="/test/1"><num>1</num><heading>Heading</heading><content>Important lead-in <p>read <ref>section 2</ref> now.</p></content><notes>Separate note.</notes></section></title></main></uscDoc>'''
        row={"id":"test:1","identifier":"/test/1","citation":"Fixture 1","body":"read section 2 now."}
        matches,findings=inspect_xml(xml,[row]);self.assertEqual(matches,0);self.assertEqual(len(findings),1)
        row["body"]="Important lead-in\nread section 2 now."
        matches,findings=inspect_xml(xml,[row]);self.assertEqual(matches,1);self.assertEqual(findings,[])
if __name__=="__main__":unittest.main()
