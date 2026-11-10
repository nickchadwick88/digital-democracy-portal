"""Deterministic fixtures only; no live model validation is claimed."""
import json
import tempfile
import unittest
from pathlib import Path
from law_repository import connect, add_source
from law_research import research, validate_explanation, explain_evidence


class ResearchTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db = connect(Path(self.temp.name) / "laws.sqlite")
        self.body = "İ😀 Original safe exit requirement. " + "surrounding text " * 150 + "needle exact quotation."
        for index in range(6):
            add_source(self.db, {"id": f"s{index}", "citation": "1 U.S.C. § 7", "heading": "Fixture",
                "jurisdiction": "TEST", "release": f"edition-{index}"}, self.body)
        self.before = self.snapshot()

    def snapshot(self):
        return [tuple(row) for row in self.db.execute("SELECT id,text_hash,body FROM sources JOIN texts ON text_hash=hash ORDER BY id")]

    def tearDown(self):
        self.assertEqual(self.snapshot(), self.before)
        self.db.close()
        self.temp.cleanup()

    def test_offline_search_and_unicode_offsets(self):
        result = research(self.db, query="needle", source_ids=["s0"])
        source = result["sources"][0]
        self.assertEqual(source["excerpt"], self.body[source["start"]:source["end"]])
        self.assertIn("needle", source["excerpt"])
        self.assertFalse(result["model_attempted"])
        self.assertFalse(source["complete_body"])
        self.assertEqual(research(self.db, query="safe")["sources"][0]["id"], "s0")

    def test_exact_citation_retains_editions_and_warns(self):
        result = research(self.db, query="1 U.S.C. § 7")
        self.assertEqual(result["matching_citation_records"], 6)
        self.assertEqual(len(result["sources"]), 4)
        self.assertTrue(result["candidates_truncated"])
        self.assertEqual(len({s["release"] for s in result["sources"]}), 4)

    def test_no_match_and_invalid_requests(self):
        self.assertEqual(research(self.db, query="notcollected")["sources"], [])
        for args in ({}, {"source_ids": ["missing"]}, {"source_ids": ["s0"] * 2},
                     {"source_ids": "s0"}, {"query": 4}, {"query": "x" * 501}, {"source_ids": [1]}):
            with self.subTest(args=args), self.assertRaises(ValueError):
                research(self.db, **args)

    def candidate(self, text="Original safe exit", source_id="s0"):
        return {"claims": [{"text": "The source includes an exit requirement.", "source_ids": [source_id],
                            "quotes": [{"source_id": source_id, "text": text}]}], "limitations": []}

    def test_exact_quote_validation_and_offsets(self):
        sources = research(self.db, source_ids=["s0"])["sources"]
        checked = validate_explanation(json.dumps(self.candidate()), sources)
        quote = checked["claims"][0]["quotes"][0]
        self.assertEqual(self.body[quote["start"]:quote["end"]], quote["text"])

    def test_fabricated_references_altered_or_unseen_quotes_rejected(self):
        sources = research(self.db, source_ids=["s0"])["sources"]
        for candidate in (self.candidate(source_id="invented"), self.candidate("Original unsafe exit"),
                          self.candidate("needle exact quotation."), self.candidate("")):
            with self.subTest(candidate=candidate), self.assertRaises(ValueError):
                validate_explanation(json.dumps(candidate), sources)
        candidate = self.candidate()
        candidate["claims"][0]["text"] = "See 99 U.S.C. § 100."
        with self.assertRaises(ValueError):
            validate_explanation(json.dumps(candidate), sources)

    def test_malformed_output_rejected(self):
        sources = research(self.db, source_ids=["s0"])["sources"]
        for raw in ("not JSON", "[]", "{}", '{"claims":[],"limitations":[]}',
                    '{"claims":[{}],"limitations":[]}', "x" * 24001):
            with self.subTest(raw=raw[:50]), self.assertRaises(ValueError):
                validate_explanation(raw, sources)


    def test_model_gate_and_empty_evidence_never_call_client(self):
        def forbidden(*args, **kwargs):
            self.fail("Model must not be called")
        result = explain_evidence(self.db, prompt="Explain", model="fixture", source_ids=["s0"], client=forbidden)
        self.assertFalse(result["model_attempted"])
        result = explain_evidence(self.db, prompt="Explain", model="fixture", query="notcollected", allow_explanation=True, client=forbidden)
        self.assertFalse(result["model_attempted"])

    def test_structured_client_receives_already_retrieved_evidence(self):
        def client(model, messages, tools, *, response_format):
            self.assertEqual(tools, [])
            self.assertIn("claims", response_format["properties"])
            self.assertEqual(json.loads(messages[1]["content"])["evidence"][0]["id"], "s0")
            return {"content": json.dumps(self.candidate())}
        result = explain_evidence(self.db, prompt="Explain", model="fixture", source_ids=["s0"], allow_explanation=True, client=client)
        self.assertEqual(result["mode"], "reference_checked_draft")
        self.assertTrue(result["model_attempted"])
        self.assertTrue(result["requires_semantic_review"])

    def test_bad_output_and_timeout_fall_back_without_delivering_claims(self):
        for message in ({"content": "not JSON"}, {"content": json.dumps(self.candidate(source_id="invented"))},
                        {"content": json.dumps(self.candidate("altered quote"))}, {"tool_calls": [{}]}):
            result = explain_evidence(self.db, prompt="Explain", model="fixture", source_ids=["s0"],
                allow_explanation=True, client=lambda *args, **kwargs: message)
            self.assertEqual(result["mode"], "evidence_only")
            self.assertEqual(result["claims"], [])
            self.assertEqual(len(result["sources"]), 1)
        def timeout(*args, **kwargs):
            raise TimeoutError("private provider detail")
        result = explain_evidence(self.db, prompt="Explain", model="fixture", source_ids=["s0"], allow_explanation=True, client=timeout)
        self.assertEqual(result["validation_error"], "TimeoutError")
        self.assertEqual(result["validation_stage"], "provider_completion")
        self.assertNotIn("private provider detail", json.dumps(result))

if __name__ == "__main__":
    unittest.main()
