# Law Library implementation and next steps

Author requirement: digitize existing laws and keep a repository of them. Added November 5, 2026.

## Implemented in this increment

- Browser-local source repository, separate from proposal wording.
- Paste exact source text or import UTF-8 .txt/.md documents.
- Record jurisdiction, citation, topic, effective date (or unknown), source URL and filename.
- Preserve exact original text and compute a SHA-256 checksum.
- Segment section headings as a reading aid without replacing the source text.
- Search title, citation, jurisdiction, topic and full text; filter by jurisdiction.
- Mark imports as Needs review. Manual transcription review is explicitly separate from legal validity and currency.
- Keep corrections or later editions as separate imports.
- Export/import law-library JSON with checksum validation and duplicate protection.
- Preserve existing records when importing a backup.
- Reject stale-tab saves instead of silently overwriting another tab.

## Remaining before the broader review edition is finished

1. PDF text extraction, scanned-document/image OCR and a proofreading step; these are not yet in this increment.
2. Explicit links from law sections and source editions to proposed amendments.
3. Reintegrate new-proposal submission, revision snapshots, backup/settings, income illustration, and the polished dashboard from the interrupted workspace work.
4. Validate all routes, mobile layouts, keyboard behavior, backup round trips and source comparisons in a browser.
5. Publish a private review site. A local-only collection is not a shared production law database.

## Later production requirements

Authoritative ingestion by jurisdiction, source licensing/permissions, scheduled source updates, repealed/superseded status, court and regulation relationships, multilingual OCR, reviewer identity and audit trails, shared durable storage, access controls and independent validation.

Do not describe an imported transcription as authoritative merely because it was digitized, checksummed, or manually reviewed.
