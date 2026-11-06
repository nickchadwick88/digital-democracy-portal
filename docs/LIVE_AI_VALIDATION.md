# Live AI validation — November 6, 2026

**Disposition: tested Qwen3/Ollama configurations rejected for ordinary law-research use. No live AI service was enabled.**

The actual Qwen3 4B model ran against an isolated corrected-corpus copy and fictional fixtures through the production tool loop and HTTP endpoint. The original mechanical score was 3/10. Transcript review found unfinished deliberation counted as answers; that score is not an acceptance result. No source-reading, search or comparison calls completed. One additional coverage call preceded a timeout. Source/workflow table fingerprints remained unchanged.

Baseline: https://github.com/nickchadwick88/digital-democracy-portal/actions/runs/42241647648

Three derived-template preflights also failed the completion/native-call gate. Their full ten-case retests were skipped, not passed:
- https://github.com/nickchadwick88/digital-democracy-portal/actions/runs/42244555893
- https://github.com/nickchadwick88/digital-democracy-portal/actions/runs/42245063528
- https://github.com/nickchadwick88/digital-democracy-portal/actions/runs/42245758695

## Shipped defensive changes

The agent rejects incomplete provider responses, exhausted output budgets and unparsed thinking markup. Coverage context is compacted, evidence is bounded, and runtime settings have explicit limits. Completion/configuration regression tests pass. No model authority was expanded.

The derived template script remains experimental and unapproved. It records exact template hashes and refuses to proceed to the full suite unless its native tool-call probe completes. The live workflow is manually dispatched so a rejected experimental stack is not repeatedly downloaded on unrelated pushes. Normal code tests remain automatic.

## Limits and next gate

The hostile-source and truncated-source scenarios were not meaningfully exercised because the model never read those fixtures. Unchanged data does not certify adversarial safety. The tested model/runtime configuration is the scope of this result.

Next: select a compatible model/runtime, pass a completed native tool-call preflight, rerun all ten tightened cases, inspect answers against retrieved evidence, and broaden evaluation. No production activation should be based on the initial 3/10 mechanical score.

The full handoff report and raw model/tool evidence are retained separately in the project files. They contain no production review records or user-private corpus.
