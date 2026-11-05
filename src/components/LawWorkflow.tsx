import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParticipation } from './ParticipationContext';
type Source = { id: string; citation: string; release: string; source_url: string; text_hash: string; body?: string };
type Correction = { id: string; source_id: string; proposed_text: string; reason: string; status: string; review_head: string };
type Transcript = { notice: string; review_head: string; accepted: { proposed_text: string; reviewer: string; review_reason: string } | null; history: { id: string; decision: string; reviewer: string; reason: string; at: string }[] };
type SourceChecks = { status?: string; kind: string; human_verification: string; legal_status: string; source_findings?: { issue: string }[] };
type Amendment = { id: string; source_id: string; original_hash: string; original_excerpt: string; start_offset: number; end_offset: number; title: string; replacement: string; reason: string; version: number; latest_version: number; diff: string; versions: { version: number; title: string; replacement: string; reason: string }[] };
async function request<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch('/api/laws/' + path, data === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Connect to the corpus review server first.');
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Request failed.'); return result;
}
function CorrectionReview({ item, run, reload, busy }: { item: Correction; run: (action: () => Promise<void>) => Promise<void>; reload: () => Promise<void>; busy: boolean }) {
  const [reviewer, setReviewer] = useState(''), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false);
  const prefix = 'review-' + item.id;
  async function review(decision: string) {
    await request('corrections/review', { correction_id: item.id, decision, reviewer, reason, expected_head: item.review_head, confirmed });
    await reload();
  }
  return <details><summary>Correction {item.id.slice(0, 8)} · {item.status}</summary><p>{item.reason}</p><pre className="statute-text">{item.proposed_text}</pre>
    {item.status === 'pending' && <form onSubmit={e => { e.preventDefault(); run(() => review('accepted')); }}>
      <label htmlFor={prefix + '-name'}>Reviewer label</label><input id={prefix + '-name'} minLength={2} maxLength={100} required value={reviewer} onChange={e => setReviewer(e.target.value)} />
      <label htmlFor={prefix + '-reason'}>Source evidence and review reason</label><textarea id={prefix + '-reason'} minLength={10} maxLength={4000} required value={reason} onChange={e => setReason(e.target.value)} />
      <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I checked this correction against the original source.</label>
      <div className="law-actions"><button disabled={busy || !confirmed}>Accept reviewed transcription</button><button type="button" disabled={busy || !confirmed || reviewer.trim().length < 2 || reason.trim().length < 10} onClick={() => run(() => review('rejected'))}>Reject correction</button></div>
    </form>}
  </details>;
}
export default function LawWorkflow({ source }: { source: Source }) {
  const navigate = useNavigate(), participation = useParticipation();
  const [checks, setChecks] = useState<SourceChecks | null>(null);
  const [items, setItems] = useState<Correction[]>([]), [transcript, setTranscript] = useState<Transcript | null>(null), [drafts, setDrafts] = useState<Amendment[]>([]);
  const [active, setActive] = useState<Amendment | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const original = source.body || '';
  const [range, setRange] = useState({ start: 0, end: Array.from(original).length, text: original });
  const [selection, setSelection] = useState<typeof range | null>(null);
  const [title, setTitle] = useState('Amend ' + source.citation), [replacement, setReplacement] = useState(original), [reason, setReason] = useState('');
  async function reload() {
    const id = encodeURIComponent(source.id);
    const [c, t, a, check] = await Promise.all([request<Correction[]>('corrections?source_id=' + id), request<Transcript>('transcription?source_id=' + id), request<Amendment[]>('amendments?source_id=' + id), request<SourceChecks>('source-checks?source_id=' + id)]);
    setItems(c); setTranscript(t); setDrafts(a); setChecks(check);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); } finally { setBusy(false); }
  }
  function edit(draft: Amendment) {
    setActive(draft); setTitle(draft.title); setReplacement(draft.replacement); setReason(draft.reason);
    setRange({ start: draft.start_offset, end: draft.end_offset, text: draft.original_excerpt });
  }
  function captureSelection(element: HTMLTextAreaElement) {
    const start = element.selectionStart, end = element.selectionEnd;
    if (end > start) setSelection({ start: Array.from(original.slice(0, start)).length, end: Array.from(original.slice(0, end)).length, text: original.slice(start, end) });
  }
  function reset() {
    setActive(null); setRange({ start: 0, end: Array.from(original).length, text: original });
    setTitle('Amend ' + source.citation); setReplacement(original); setReason(''); setSelection(null);
  }
  async function save() {
    const value = active
      ? await request<Amendment>('amendments/revise', { amendment_id: active.id, expected_version: active.version, title, replacement, reason })
      : await request<Amendment>('amendments', { source_id: source.id, original_hash: source.text_hash, start_offset: range.start, end_offset: range.end, title, replacement, reason });
    edit(value); await reload(); setMessage('Amendment draft saved. It has not changed the law.');
  }
  function sendToDemo() {
    if (!active) return;
    const draft = {
      id: 'amendment-' + active.id + '-v' + active.version,
      title: active.title.slice(0, 130) + ' (amendment v' + active.version + ')', category: 'Governance',
      summary: ('Proposed change to ' + source.citation + ': ' + active.reason).slice(0, 500),
      text: 'Original wording:\n' + active.original_excerpt + '\n\nProposed replacement:\n' + (active.replacement || '[Delete the selected text]') + '\n\nReason:\n' + active.reason,
      sourceLaw: { sourceId: source.id, textHash: source.text_hash, citation: source.citation, release: source.release, sourceUrl: source.source_url, amendmentId: active.id, amendmentVersion: active.version },
    };
    const id = participation.submitDraft(draft);
    if (id) navigate('/proposal/' + id);
  }
  return <section className="section-card"><h2>Review and amend this provision</h2><p>Transcription review and proposed legal amendments are separate. Neither process enacts a law. Reviewer labels are self-reported in this local review edition.</p>
    <button disabled={busy} onClick={() => run(reload)}>Load review and amendment history</button>
    {checks && <div><h3>Source checks</h3><p>{checks.kind}: {checks.status || (checks.source_findings?.length ? 'This record needs inspection.' : 'No text-fidelity finding for this record in the available report.')}</p><p>Human verification: {checks.human_verification}. Legal status: {checks.legal_status}.</p>{checks.source_findings?.map((finding, i) => <p key={i}>{finding.issue}</p>)}</div>}
    {transcript && <><h3>Reviewed transcription</h3><p>{transcript.notice}</p>{transcript.accepted ? <><p>Locally accepted by {transcript.accepted.reviewer}: {transcript.accepted.review_reason}</p><pre className="statute-text">{transcript.accepted.proposed_text}</pre></> : <p>No reviewed transcription has been accepted. The original extraction remains the source view.</p>}
      <details><summary>Transcription review audit trail ({transcript.history.length})</summary>{transcript.history.map(review => <p key={review.id}>{review.at} · {review.decision} · {review.reviewer} · {review.reason}</p>)}</details></>}
    <h3>Correction queue</h3>{items.map(item => <CorrectionReview key={item.id + item.review_head + item.status} item={item} run={run} reload={reload} busy={busy} />)}
    <h3>Draft a legal amendment</h3><p>Select wording from the original extraction, then enter its proposed replacement. An empty replacement requests deletion. Saved versions preserve the original source hash and selection.</p>
    {!active && <><label htmlFor="amendment-original">Original statutory body — select the words to amend</label><textarea id="amendment-original" readOnly rows={8} value={original} onSelect={event => captureSelection(event.currentTarget)} onMouseUp={event => captureSelection(event.currentTarget)} onKeyUp={event => captureSelection(event.currentTarget)} /><button disabled={!selection || busy} onClick={() => { if (selection) { setRange(selection); setReplacement(selection.text); } }}>Use selected wording</button></>}
    <p>Target: characters {range.start}–{range.end} of the pinned source extraction.</p><details><summary>Original target wording</summary><pre className="statute-text">{range.text}</pre></details>
    <form onSubmit={e => { e.preventDefault(); run(save); }}>
      <label htmlFor="amendment-title">Amendment title</label><input id="amendment-title" value={title} minLength={5} maxLength={160} onChange={e => setTitle(e.target.value)} required />
      <label htmlFor="amendment-replacement">Proposed replacement wording</label><textarea id="amendment-replacement" rows={8} maxLength={200000} value={replacement} onChange={e => setReplacement(e.target.value)} />
      <label htmlFor="amendment-reason">Reason for the legal change</label><textarea id="amendment-reason" minLength={10} maxLength={4000} value={reason} onChange={e => setReason(e.target.value)} required />
      <div className="law-actions"><button disabled={busy || !range.text || (active !== null && active.version !== active.latest_version)}>Save amendment draft</button><button type="button" onClick={reset}>Start another amendment</button></div>
    </form>
    {active && <><h3>Draft version {active.version} · not enacted</h3><pre className="statute-text law-diff">{active.diff}</pre>
      <button disabled={busy || replacement !== active.replacement || title !== active.title || reason !== active.reason} onClick={sendToDemo}>Copy saved version to demo proposal review</button>
      <p className="muted">This creates a browser-local proposal with a pinned source reference. It does not submit to a government or carry votes forward from another version. Save edits before copying.</p>
      <div className="law-actions">{active.versions.map(version => <button key={version.version} disabled={busy} onClick={() => run(async () => edit(await request<Amendment>('amendment?id=' + encodeURIComponent(active.id) + '&version=' + version.version)))}>Open draft version {version.version}</button>)}</div></>}
    {drafts.length > 0 && <details><summary>Saved amendment drafts ({drafts.length})</summary>{drafts.map(draft => <p key={draft.id}><button onClick={() => edit(draft)}>{draft.title} · {draft.id.slice(0, 8)} · version {draft.version}</button></p>)}</details>}
    {error && <p role="alert" className="error-message">{error}</p>}{participation.error && <p role="alert" className="error-message">{participation.error}</p>}<p role="status">{message}</p>
  </section>;
}
