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
