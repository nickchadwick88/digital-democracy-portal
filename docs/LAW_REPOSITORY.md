# Law repository — review edition

The law corpus is separate from personal pasted/text-file intake and from proposal/vote records. It collects actual official-source statutory text, not AI reconstructions. This is a research prototype, not a claim that the project has collected every law.

## Run locally

Python 3.11+ standard library and the portal's documented Node version are sufficient.

    python3 scripts/collect_uscode.py --output ../law-corpus --titles 1 2 3 4 5
    python3 scripts/collect_uscode.py --output ../law-corpus --titles 6 7 8 9 10 --export
    python3 scripts/collect_boundaries.py --output ../law-corpus/us-states.json
    npm ci
    npm run build
    python3 scripts/serve_laws.py --db ../law-corpus/laws.sqlite --dist dist

Open http://127.0.0.1:8765/law-explorer. Import more titles in batches; each title is committed independently and safely skipped if its pinned archive is already imported. Supply titles 1–54 except reserved 53 and the source catalog's appendices explicitly (05a, 11a, 18a). Verify catalog coverage rather than assuming numeric titles cover everything. The fixed initial release is 119-136, current through Public Law 119-136 in the official catalog, October 22, 2026. Later releases must have separate edition IDs and verified URLs. Collector currently supports this pinned release only.

The local server binds loopback, rejects unrecognized Host headers, requires same-origin JSON writes, and does not expose credentials or arbitrary execution. This is a single-user review server, not production identity, election, or multi-user infrastructure. Do not publicly expose it.

## Source and consolidated layers

- **Original archives:** official downloaded XML ZIPs retained unchanged with SHA-256 hashes.
- **Source records:** jurisdiction, citation, official identifier, edition, title, member filename, extraction time, source status attribute, notes and credits.
- **Text index:** SQLite FTS5 over citation, heading and extracted statutory body.
- **Consolidated index:** one canonical body per exact SHA-256 match, with all source occurrences retained. It does not infer common legal meaning, applicability, or adoption from matching words.
- **Corrections:** pending requests anchored to the source ID and original text hash. No endpoint edits, deletes, approves, or replaces original statutes.
- **Amendments:** distinct future workflow requiring proposal, version and valid legal decision process. A correction request cannot enact a law.

Unknown individual effective dates remain unknown. Retained section records may be repealed, omitted, reserved or otherwise historical; an unspecified source status is not a finding that a provision is in force. Notes can contain enacted provisions as well as editorial material: notes and credits are preserved separately and are not currently included in FTS search. Machine extraction preserves inline references, but tables, mathematical notation, footnotes and complex formatting require verification against original XML. Raw archives are the reconstruction source.

All-title archive coverage is still not all federal law: uncodified public laws, regulations, case law, state and local legislation, and non-US jurisdictions require additional source-specific collection.

## Review tools

    python3 scripts/law_repository.py --db ../law-corpus/laws.sqlite stats
    python3 scripts/law_repository.py --db ../law-corpus/laws.sqlite search building safety
    python3 scripts/law_repository.py --db ../law-corpus/laws.sqlite get SOURCE_ID
    python3 scripts/law_repository.py --db ../law-corpus/laws.sqlite consolidated
    python3 scripts/law_repository.py --db ../law-corpus/laws.sqlite compare SOURCE_A SOURCE_B
    python3 scripts/law_repository.py --db ../law-corpus/laws.sqlite correct SOURCE_ID corrected.txt "Evidence and reason"

Exports: manifest.json reports actual collected coverage; statutes.jsonl.gz contains UTF-8 plain-text bodies and provenance in JSON Lines; laws.sqlite contains the indexed repository. Back up the corpus directory separately from the git repository. Do not put bulk datasets, personal corrections, model logs or credentials in source control.

## Agentic AI

The built-in assistant uses a **local Ollama model with tool support**. Install/run a suitable model separately, set LAW_AGENT_MODEL to its exact installed name, then launch the review server. Without a configured/running model, the UI reports AI as disconnected; it does not simulate model answers.

The model can repeatedly search, read, compare, inspect exact duplicates and inspect coverage. The application enforces at most six model rounds and twelve tool calls per request. It has no shell tool, arbitrary web fetch, source mutation, enactment, voting, or payment authority. Prompts and source material are untrusted; model output remains unverified. Coverage is always included. Model answers and tool traces are saved in agent_runs for review. Clear/log retention management is future work. The source database is passed only to the fixed loopback Ollama endpoint; there is no cloud model transmission.

Tests use an injected fixture model to verify orchestration and access boundaries. A live-model end-to-end run remains necessary on a machine with Ollama installed.

## Source registry and next collection

| Scope | Official starting source | Collection state |
|---|---|---|
| US federal codified statutes | https://uscode.house.gov/download.html | Resumable importer implemented; actual imported titles reported by manifest |
| US public and session laws | https://www.govinfo.gov/bulkdata | Not imported |
| Colorado statutes | https://content.leg.colorado.gov/agencies/office-legislative-legal-services/2026-crs-titles-download | Official catalog located; not imported |
| Municipal laws / building-code adoption | Official municipal legislative repositories and adopting ordinances | Not imported; track edition and local amendments |
| Other states and countries | Respective official legislative publishers | Not imported |

For adopted building codes, sharing requires the exact adopted edition plus each adopting ordinance and local exceptions. Some model-code publications have separate reuse conditions. Do not republish their full text merely because an ordinance references them. Record citation and adoption relationship while validating the source's distribution terms.

## Visual scope

The explorer shows actual counts by U.S. Code title, exact-text duplicate occurrences and textual differences. The geographic map uses simplified Census state boundaries with Alaska/Hawaii insets. Gray means state law has not been collected; federal records are tracked separately. State tiles provide an alphabetical keyboard-friendly alternative. Applicability/difference networks require jurisdictional adoption records. Missing data is always displayed as not collected.

## Validation

    npm run build
    npm run lint
    npm test
    python3 -m unittest discover -s scripts -p 'test_*.py'

The machine corpus is not individually proofread or legally certified. This review edition needs production storage/authentication, independent source verification and broader jurisdiction coverage before public reliance.

Duplicate section numbers in an official edition retain separate source occurrences using the XML element ID. Nested quotations inside notes are retained with the parent notes and are not misclassified as independent codified sections. No occurrence is silently overwritten.


## Correction review and amendment drafting

A source's review workspace lists pending/accepted/rejected corrections. A local reviewer supplies a label, evidence/reason and confirmation of checking the original. Accepted text is a separate transcription overlay. Original bodies, hashes and search remain unchanged. Later acceptance explicitly supersedes the previous overlay; stale review tokens and repeat decisions are rejected. This is self-reported single-user review, not authenticated legal certification.

Amendments pin the source ID, original hash and Unicode-code-point selection offsets. Empty replacement text means deletion. Every draft revision is retained; stale edits cannot overwrite newer versions. A saved draft version can be copied to browser-local proposal review with provenance preserved through backups. Proposal revisions remain distinct from backend amendment revisions. No endpoint enacts a law or edits the official source.

Run automated source checks with:
    python3 scripts/audit_source_text.py --corpus ../law-corpus

This independent audit compares whitespace-insensitive body text against retained XML and flags mismatches. It does not establish legal force, effective dates, table layout or legal meaning. No human verification is inferred. The report is displayed when source-audit.json is beside laws.sqlite.

Backend correction reviews and amendment histories are in laws.sqlite; browser proposal copies and votes are in browser backups. Back up both. Existing downloaded snapshots do not automatically contain new review records or later audit reports.


## Text-v2 rebuild and previous snapshot warning

The first extractor could drop surrounding words when a content container included inline elements (for example a date). The independent audit flagged 16,695 of 60,463 records for investigation. Do not treat the initial extraction as a complete transcription.

The text-v2 extractor preserves node text, inline element text and all tails. Rebuilds use a **new output directory** and validate retained archive hashes. A legacy database cannot be relabeled or updated in place. The rebuilt snapshot includes an independent source-text audit and an old/new hash comparison report. Original XML archives are retained unchanged.

All records must pass the whitespace-insensitive comparison before adopting the rebuilt snapshot. This still does not certify table layout, mathematical interpretation, legal force or effective dates. Source hashes anchor correction and amendment records; old review data must not be blindly merged into a different extraction snapshot.

The selection editor reads the current textarea range directly and also provides an exact-wording fallback. Repeated exact phrases require selecting the intended occurrence rather than guessing.

    python3 scripts/collect_uscode.py --output ../law-corpus-v2 --source-cache ../law-corpus/originals --titles 1 2 3 4 5 --export
    python3 scripts/audit_source_text.py --corpus ../law-corpus-v2
    python3 scripts/compare_extractions.py --old ../law-corpus --new ../law-corpus-v2

Use all previously collected titles when comparing the complete corpus; the five-title example is only a small local rebuild example.


## Live AI validation

The live validation workflow runs a pinned official Ollama runtime and an actual Qwen3 4B model on an isolated test runner. It uses a copy of the corrected federal corpus and separate clearly fictional adversarial fixtures. No user laptop, cloud-model API key or production data writes are required.

It exercises the real app HTTP agent endpoint plus source reading, verbatim quotation, search/citation support, missing municipal coverage, fabricated citations, unknown effective dates, identical wording versus legal effect, hostile instructions embedded in source text, truncated evidence and attempted writes. Original-source and correction/amendment table fingerprints are compared before and after. Answers, tool traces, raw assistant messages, elapsed times, model digest, runtime version and configuration are retained. Model reasoning fields are not collected.

Mechanical smoke criteria are deliberately narrower than legal correctness. Passing these cases cannot certify legal reasoning, adversarial safety, production readiness or all future model responses. Failed cases remain in the report and must not be described as passed. Live use requires the model service to be running; a completed CI benchmark does not create a permanent hosted assistant.

Runtime controls: LAW_AGENT_CONTEXT (2,048–32,768 tokens), LAW_AGENT_TOKENS (128–2,048), LAW_AGENT_TIMEOUT (10–300 seconds), LAW_AGENT_EVIDENCE_LIMIT (1,000–60,000 characters) and optional LAW_AGENT_THINK=true/false. Validation uses context 8,192, output 640, timeout 90 seconds, evidence 12,000 characters and thinking disabled. Coverage metadata is compacted to preserve the user's actual question within context.


### First live run and template remediation

The unmodified Qwen3 4B configuration failed live validation. Its initial mechanical score was 3/10, but review found unfinished deliberation counted as answers; that score does not mean three useful verified answers. No database retrieval/comparison tool calls were completed, one case timed out, and source/workflow fingerprints remained unchanged.

The downloaded legacy Qwen3 template printed function structs instead of explicit JSON and did not honor think=false in the generation prefix. A separately named derived model now patches only the template: JSON-serialize function schemas and use Qwen's empty thinking prefix when thinking is disabled. Base weights remain unchanged; original/derived template hashes and a native function-call probe are retained. This derived configuration must be validated independently and must not be presented as validation of the unmodified model tag.

The app now rejects output-budget exhaustion, incomplete provider responses and unparsed thinking markup instead of displaying them as completed answers. Benchmark checks also require concise completed answers. A refusal mentioning the user's requested fixture is not treated as a fabricated factual citation.

The non-thinking validation alias uses an unconditional empty thinking block and the documented Qwen /no_think soft switch (LAW_AGENT_QWEN_NO_THINK=true). This alias is explicitly for non-thinking operation. A native tool-call probe must complete before the ten-case suite is permitted to run. Failed probes remain evidence of an unsuitable configuration; they are not counted as successful validation.

### Validation disposition (November 6, 2026)

The baseline and three derived-template probes did not satisfy live-AI acceptance. The tested Qwen3/Ollama stack remains unapproved; it was not activated as a persistent service. See LIVE_AI_VALIDATION.md for the public reproducibility summary. Passing ordinary code tests does not change that disposition. Heavy live runs are now manually dispatched; normal code checks remain automatic.


### Evidence-first research (AI explanations disabled)

`POST /api/laws/research` accepts `query` (explicit keywords or exact `1 U.S.C. § 7` style citation) and/or up to four `source_ids`. The application retrieves canonical original text before any interpretation. Responses contain at most four 1,800-codepoint excerpts, source IDs, edition/jurisdiction, original body hashes, official URLs and original codepoint offsets. Exact citations retain multiple stored editions; incomplete candidate sets and collection gaps are explicit. Search has AND semantics for up to sixteen terms; this is not natural-language legal applicability analysis.

The portal's evidence form works offline with the local corpus and makes no model calls. AI explanations remain disabled. `law_research.validate_explanation` provides a separately tested foundation for future integration: unknown source IDs, unsupported U.S. Code citations and altered quotations are rejected; every claim reference needs an exact quote from the retrieved excerpt. These checks do not prove paraphrase entailment or legal correctness. No model integration or live-model acceptance is claimed. The older `/agent` endpoint remains an experimental diagnostic and does not receive these new guarantees.
