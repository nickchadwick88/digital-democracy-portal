"""Retrieve original evidence before any explanation. No source mutations or model tools.

Production explanations remain disabled until a compatible model is live-validated.
validate_explanation is a deterministic reference check, not a legal accuracy test.
"""
import json
import re
from law_repository import get_source, search, stats

LIMIT = 4
EXCERPT = 1800
LIMITATIONS = [
    "Only imported editions are searched; no matches does not mean no law exists.",
    "Effective dates, current legal force, and applicability have not been independently verified.",
    "Excerpts can omit qualifications. Open the complete original source before relying on a passage.",
    "Exact text matches do not establish legal equivalence across jurisdictions.",
]


def short_text(value, name, maximum=500):
    if not isinstance(value, str) or len(value) > maximum:
        raise ValueError(f"{name} must be text of at most {maximum} characters.")
    return value.strip()


def evidence_record(source, query):
    body = source["body"]
    terms = re.findall(r"\w+", query)[:16]
    hit = re.search("|".join(re.escape(term) for term in terms), body, re.I) if terms else None
    start = max(0, (hit.start() if hit else 0) - 300)
    end = min(len(body), start + EXCERPT)
    return {**{key: source[key] for key in (
        "id", "citation", "heading", "jurisdiction", "release", "source_url", "text_hash"
    )}, "excerpt": body[start:end], "start": start, "end": end,
        "complete_body": start == 0 and end == len(body)}


def research(db, *, query="", source_ids=None):
    """Exact citation or explicit keyword search; return bounded original excerpts."""
    query = short_text(query, "query")
    if source_ids is None:
        source_ids = []
    if not isinstance(source_ids, list) or len(source_ids) > LIMIT:
        raise ValueError("Select at most four source IDs.")
    ids = [short_text(value, "source_id") for value in source_ids]
    if any(not value for value in ids) or len(set(ids)) != len(ids):
        raise ValueError("Source IDs must be nonempty and unique.")
    if not ids and not query:
        raise ValueError("Enter evidence search words, an exact U.S. Code citation, or select an open source.")
    total = None
    if ids:
        records = [get_source(db, value) for value in ids]
        method = "explicit_source_ids"
        total = len(records)
    else:
        citation = re.fullmatch(r"(\d+)\s+U\.?\s*S\.?\s*C\.?\s*§?\s*([\w-]+)", query, re.I)
        if citation:
            canonical = f"{citation[1]} U.S.C. § {citation[2]}"
            total = db.execute("SELECT count(*) FROM sources WHERE citation=?", (canonical,)).fetchone()[0]
            rows = db.execute("SELECT id FROM sources WHERE citation=? ORDER BY release,id LIMIT ?", (canonical, LIMIT)).fetchall()
            method = "exact_citation"
        else:
            rows = search(db, query, limit=LIMIT + 1)
            method = "keyword_search"
        records = [get_source(db, row["id"]) for row in rows[:LIMIT]]
    sources = [evidence_record(record, "" if method == "exact_citation" else query) for record in records]
    coverage = stats(db)
    truncated = total > LIMIT if total is not None else len(rows) > LIMIT
    limitations = list(LIMITATIONS)
    if truncated:
        limitations.append("More candidates exist than are shown. Refine the search or select explicit sources.")
    if method == "exact_citation" and total > 1:
        limitations.append("This citation has multiple stored occurrences or editions; no current edition was selected automatically.")
    return {
        "mode": "evidence_only", "status": "Original evidence; no AI interpretation generated",
        "sources": sources, "claims": [], "limitations": limitations,
        "candidates_truncated": truncated, "matching_citation_records": total if method == "exact_citation" else None,
        "coverage": {key: coverage[key] for key in ("source_records", "jurisdictions", "coverage_note", "transcription_status")},
        "model_attempted": False, "reference_checks": "No generated claims to check",
        "trace": [{"method": method, "query": query, "source_ids": ids}],
    }


def validate_explanation(raw, sources):
    """Reject unknown IDs and non-verbatim quotes. Does not prove entailment.

    Offsets are Python Unicode codepoints into the canonical original body.
    This helper is not an enabled model integration or live validation result.
    """
    if not isinstance(raw, str) or len(raw) > 24000:
        raise ValueError("Explanation must be bounded JSON text.")
    value = json.loads(raw)
    if not isinstance(value, dict) or set(value) != {"claims", "limitations"}:
        raise ValueError("Expected claims and limitations only.")
    claims, limitations = value["claims"], value["limitations"]
    if not isinstance(claims, list) or not 1 <= len(claims) <= 12:
        raise ValueError("Expected one to twelve claims.")
    if not isinstance(limitations, list) or len(limitations) > 12:
        raise ValueError("Invalid limitations.")
    for item in limitations:
        if not short_text(item, "limitation", 1000):
            raise ValueError("Empty limitation.")
    by_id = {source["id"]: source for source in sources}
    checked = []
    for claim in claims:
        if not isinstance(claim, dict) or set(claim) != {"text", "source_ids", "quotes"}:
            raise ValueError("Malformed claim.")
        if not short_text(claim["text"], "claim", 2000):
            raise ValueError("Empty claim.")
        ids, quotes = claim["source_ids"], claim["quotes"]
        if not isinstance(ids, list) or not 1 <= len(ids) <= LIMIT or any(not isinstance(i, str) or i not in by_id for i in ids):
            raise ValueError("Claim references an unretrieved source.")
        if len(set(ids)) != len(ids) or not isinstance(quotes, list) or not 1 <= len(quotes) <= 8:
            raise ValueError("Invalid source references or quotes.")
        checked_quotes = []
        for quote in quotes:
            if not isinstance(quote, dict) or set(quote) != {"source_id", "text"}:
                raise ValueError("Malformed quote.")
            source_id, text = quote["source_id"], quote["text"]
            if not isinstance(source_id, str) or source_id not in ids:
                raise ValueError("Quote references an unretrieved source.")
            if not isinstance(text, str) or not text.strip() or len(text) > EXCERPT:
                raise ValueError("Invalid quote text.")
            source = by_id[source_id]
            offset = source["excerpt"].find(text)
            if offset < 0:
                raise ValueError("Quote does not exactly match retrieved evidence.")
            checked_quotes.append({**quote, "start": source["start"] + offset, "end": source["start"] + offset + len(text)})
        if set(ids) != {quote["source_id"] for quote in checked_quotes}:
            raise ValueError("Every cited source requires a matching quote.")
        # Citation strings in prose must also belong to the claim's references.
        allowed = {by_id[i]["citation"] for i in ids}
        for title, section in re.findall(r"(\d+)\s+U\.?\s*S\.?\s*C\.?\s*§\s*([\w-]+)", claim["text"], re.I):
            if f"{title} U.S.C. § {section}" not in allowed:
                raise ValueError("Claim contains an unsupported citation.")
        checked.append({**claim, "quotes": checked_quotes})
    return {"claims": checked, "limitations": limitations,
            "reference_checks": "Source IDs and exact quotations checked; interpretation remains unverified"}
