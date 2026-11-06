import io
import json
import unittest
from unittest.mock import patch
from law_agent import request_model,bounded_setting
class FakeOpener:
    def __init__(self,response):self.response=response
    def open(self,request,timeout):return io.BytesIO(json.dumps(self.response).encode())
class CompletionTest(unittest.TestCase):
    def call(self,response):
        with patch("law_agent.urllib.request.build_opener",return_value=FakeOpener(response)):
            return request_model("fixture-model",[{"role":"user","content":"Question"}],[])
    def test_output_budget_exhaustion_cannot_be_returned_as_a_final_answer(self):
        with self.assertRaisesRegex(ValueError,"did not finish"):
            self.call({"done":True,"done_reason":"length","message":{"role":"assistant","content":"Unfinished answer"}})
        with self.assertRaisesRegex(ValueError,"did not finish"):
            self.call({"done":False,"message":{"role":"assistant","content":"Partial"}})
    def test_unparsed_reasoning_markup_is_rejected(self):
        with self.assertRaisesRegex(ValueError,"reasoning markup"):
            self.call({"done":True,"done_reason":"stop","message":{"role":"assistant","content":"private draft</think>Answer"}})
    def test_complete_native_tool_call_is_preserved(self):
        message={"role":"assistant","content":"","tool_calls":[{"function":{"name":"get_source","arguments":{"source_id":"fixture:1"}}}]}
        self.assertEqual(self.call({"done":True,"done_reason":"stop","message":message}),message)
    def test_runtime_limits_cannot_silently_exceed_bounds(self):
        with patch.dict("os.environ",{"LIMIT_FIXTURE":"999999"}):
            with self.assertRaises(ValueError):bounded_setting("LIMIT_FIXTURE",10,1,20)
if __name__=="__main__":unittest.main()
