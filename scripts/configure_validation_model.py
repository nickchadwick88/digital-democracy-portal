#!/usr/bin/env python3
"""Repair a known legacy Qwen3 template for pinned Ollama; weights remain unchanged."""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

def api(path,payload):
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    request=urllib.request.Request("http://127.0.0.1:11434"+path,data=json.dumps(payload).encode(),headers={"Content-Type":"application/json"})
    with opener.open(request,timeout=120) as response:return json.load(response)
def configure(base,model,output):
    output.mkdir(parents=True,exist_ok=True)
    source=api("/api/show",{"model":base})
    template=source["template"]
    patched,count=re.subn(r"\{\{\s*\.Function\s*\}\}","{{ json .Function }}",template)
    if count!=1:raise ValueError("Expected one legacy tool-schema template expression; inspect this model before patching.")
    generation='{{- if and (ne .Role "assistant") $last }}<|im_start|>assistant'
    if patched.count(generation)!=1:raise ValueError("Expected the reviewed Qwen3 assistant-generation template marker.")
    patched=patched.replace(generation,generation+'\n{{ if and $.IsThinkSet (not $.Think) }}<think>\n\n</think>\n\n{{ end }}')
    metadata={"base_model":base,"derived_model":model,
      "base_template_sha256":hashlib.sha256(template.encode()).hexdigest(),
      "derived_template_sha256":hashlib.sha256(patched.encode()).hexdigest(),
      "base_template":template,"derived_template":patched,
      "changes":["Explicit JSON serialization for native function schemas.","Respect think=false with the model's empty thinking prefix."],
      "notice":"Derived template, same downloaded base weights. This is not the unmodified model-tag configuration."}
    (output/"model-template-metadata.json").write_text(json.dumps(metadata,indent=2))
    api("/api/create",{"model":model,"from":base,"template":patched,"stream":False})
    tools=[{"type":"function","function":{"name":"lookup_code","description":"Look up the value for a provided key.",
      "parameters":{"type":"object","properties":{"key":{"type":"string"}},"required":["key"]}}}]
    probe=api("/api/chat",{"model":model,"think":False,"stream":False,"options":{"temperature":0,"num_ctx":4096,"num_predict":160},
      "messages":[{"role":"system","content":"Use the lookup_code tool when asked; do not guess values."},
                  {"role":"user","content":"Call lookup_code with key probe."}],"tools":tools})
    # Do not collect separately typed reasoning fields.
    message=probe.get("message",{})
    saved={"done":probe.get("done"),"done_reason":probe.get("done_reason"),
      "message":{k:message[k] for k in ["role","content","tool_calls"] if k in message},
      "thinking_field_characters":len(message.get("thinking",""))}
    (output/"provider-tool-probe.json").write_text(json.dumps(saved,indent=2))
    calls=message.get("tool_calls",[])
    assert probe.get("done") and probe.get("done_reason")!="length","Provider probe was incomplete."
    assert any(c.get("function",{}).get("name")=="lookup_code" and c["function"].get("arguments",{}).get("key")=="probe" for c in calls),"Provider did not emit a native tool call."
    print(json.dumps({"native_tool_probe":"passed","derived_model":model,"template_sha256":metadata["derived_template_sha256"]}),flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--base",required=True);p.add_argument("--model",required=True);p.add_argument("--output",type=Path,required=True);a=p.parse_args();configure(a.base,a.model,a.output)
