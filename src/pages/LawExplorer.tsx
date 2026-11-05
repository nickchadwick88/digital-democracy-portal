import { useState } from 'react';
import Layout from '../components/Layout';
import './LawExplorer.css';

type Source = { id: string; citation: string; heading: string; jurisdiction: string; release: string; source_url: string; text_hash: string; body?: string; excerpt?: string; notes?: string; credit?: string };
type Stats = { source_records: number; unique_nonempty_texts: number; nonempty_records: number; pending_corrections: number; coverage_note: string; transcription_status: string; agent_configured: boolean; titles: { title_number: string; count: number }[]; jurisdictions: { jurisdiction: string; count: number }[] };
type Group = { hash: string; excerpt: string; occurrences: number; references: Source[] };
type Comparison = { first: Source; second: Source; identical_text: boolean; legal_equivalence: string; diff: string };
type Agent = { answer: string; status: string; trace: { tool: string; arguments: Record<string, string> }[] };
const states = 'AK AL AR AZ CA CO CT DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split(' ');
async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch('/api/laws/' + path, data === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The corpus server is not connected. Start the local review server to search collected laws.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request failed.');
  return result as T;
}
export default function LawExplorer() {
  const [stats, setStats] = useState<Stats | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(''), [results, setResults] = useState<Source[]>([]), [searched, setSearched] = useState(false);
  const [source, setSource] = useState<Source | null>(null), [groups, setGroups] = useState<Group[]>([]);
  const [first, setFirst] = useState(''), [second, setSecond] = useState(''), [comparison, setComparison] = useState<Comparison | null>(null);
  const [correction, setCorrection] = useState(''), [reason, setReason] = useState(''), [message, setMessage] = useState('');
  const [prompt, setPrompt] = useState(''), [agent, setAgent] = useState<Agent | null>(null), [selectedState, setSelectedState] = useState('CO');
  async function task(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'The request failed.'); } finally { setBusy(false); }
  }
  async function open(id: string) {
    const value = await api<Source>('source?id=' + encodeURIComponent(id)); setSource(value); setCorrection(value.body || ''); setReason('');
  }
  const max = Math.max(1, ...(stats?.titles.map(t => t.count) || []));
  return <Layout title="Law research workspace" subtitle="Official-source text, a separate consolidated index, and traceable comparisons.">
    <section className="section-card">
      <h2>Collected statutes</h2><p>Search the collected corpus here. The separate <a href="/laws">personal law intake</a> accepts pasted text and text files.</p>
      <button disabled={busy} onClick={() => task(async () => setStats(await api<Stats>('stats')))}>Connect to corpus</button>
      <p className="muted">This workspace requires the local corpus server. A hosted static preview does not contain the full database.</p>
      {stats && <><div className="corpus-stats"><strong>{stats.source_records.toLocaleString()}<small>source records</small></strong><strong>{stats.unique_nonempty_texts.toLocaleString()}<small>unique nonempty texts</small></strong><strong>{stats.pending_corrections}<small>pending corrections</small></strong></div>
        <p>{stats.coverage_note}</p><p className="muted">{stats.transcription_status} Release points are not individual effective dates.</p></>}
    </section>
    <section className="section-card"><h2>Search and reference</h2><form onSubmit={e => { e.preventDefault(); task(async () => { setResults(await api<Source[]>('search?q=' + encodeURIComponent(query))); setSearched(true); }); }}>
      <label htmlFor="corpus-query">Words or citation</label><div className="law-actions"><input id="corpus-query" value={query} maxLength={500} onChange={e => setQuery(e.target.value)} required /><button disabled={busy}>Search</button></div></form>
      {searched && <p role="status">{results.length} results shown, up to 20. All query words must match.</p>}
      <div className="law-results">{results.map(item => <article key={item.id}><h3>{item.citation} — {item.heading}</h3><p>{item.excerpt}</p><p className="muted">{item.jurisdiction} · release {item.release}</p><div className="law-actions"><button disabled={busy} onClick={() => task(() => open(item.id))}>Read source</button><button onClick={() => { setFirst(item.id); setComparison(null); }}>Compare as A</button><button onClick={() => { setSecond(item.id); setComparison(null); }}>Compare as B</button></div></article>)}</div>
    </section>
    {source && <section className="section-card"><h2>{source.citation} — {source.heading}</h2><p><a href={source.source_url} target="_blank" rel="noreferrer">Official source archive</a> · {source.jurisdiction} · release {source.release}</p><p className="source-reference">{source.id}<br />SHA-256: {source.text_hash}</p><pre className="statute-text">{source.body || 'No statutory body in this source record. Inspect the original archive and notes.'}</pre>
      {source.notes && <details><summary>Preserved source notes</summary><pre className="statute-text">{source.notes}</pre></details>}
      {source.credit && <details><summary>Source credits</summary><pre className="statute-text">{source.credit}</pre></details>}
      <details><summary>Propose a transcription correction</summary><p>The source remains unchanged. This creates a pending correction for review. A change to the law itself requires an amendment proposal.</p>
        <form onSubmit={e => { e.preventDefault(); task(async () => { await api('corrections', { source_id: source.id, proposed_text: correction, reason }); setMessage('Correction submitted for review. The original source is preserved.'); setStats(await api<Stats>('stats')); }); }}>
          <label htmlFor="correction-body">Proposed corrected transcription</label><textarea id="correction-body" value={correction} maxLength={200000} onChange={e => setCorrection(e.target.value)} required rows={8} />
          <label htmlFor="correction-reason">Evidence and reason</label><textarea id="correction-reason" value={reason} minLength={5} maxLength={4000} onChange={e => setReason(e.target.value)} required />
          <button disabled={busy || correction === source.body}>Submit correction draft</button></form></details>
    </section>}
    <section className="section-card"><h2>Compare provisions</h2><p>Choose two results above or paste their source IDs. Matching text alone does not establish matching legal effect.</p>
      <form onSubmit={e => { e.preventDefault(); task(async () => setComparison(await api<Comparison>('compare?first=' + encodeURIComponent(first) + '&second=' + encodeURIComponent(second)))); }}>
        <label htmlFor="compare-a">Source A</label><input id="compare-a" value={first} onChange={e => { setFirst(e.target.value); setComparison(null); }} required />
        <label htmlFor="compare-b">Source B</label><input id="compare-b" value={second} onChange={e => { setSecond(e.target.value); setComparison(null); }} required /><button disabled={busy}>Compare wording</button></form>
      {comparison && <><h3>{comparison.first.citation} / {comparison.second.citation}</h3><p>{comparison.identical_text ? 'Extracted body text is identical.' : 'Extracted body text differs.'} {comparison.legal_equivalence}</p><pre className="statute-text law-diff">{comparison.diff || 'No textual differences.'}</pre></>}
    </section>
    <section className="section-card"><h2>Consolidated text index</h2><p>Identical extracted text is stored once. This separate view lists its occurrences; each source retains its own citation and jurisdiction.</p>
      <button disabled={busy} onClick={() => task(async () => { const value = await api<Group[]>('consolidated'); setGroups(value); if (!value.length) setMessage('No repeated nonempty text found in the collected corpus.'); })}>Find shared text</button>
      {groups.map(group => <details key={group.hash}><summary>{group.occurrences} source references share this text</summary><p>{group.excerpt}…</p>{group.references.map(ref => <p key={ref.id}><button disabled={busy} onClick={() => task(() => open(ref.id))}>{ref.citation} · {ref.jurisdiction} · {ref.release}</button></p>)}</details>)}
    </section>
    <section className="section-card"><h2>Coverage and graphics</h2><p>Federal records: {stats?.jurisdictions.find(j => j.jurisdiction === 'US-FEDERAL')?.count.toLocaleString() || 'not connected'}. State and local collections have not been imported by this collector.</p>
      <h3>State coverage index</h3><p className="muted">Alphabetical tiles, not geographic boundaries. Gray means not collected. It does not mean a state has no laws.</p><div className="state-tiles">{states.map(state => <button key={state} aria-pressed={selectedState === state} onClick={() => setSelectedState(state)}>{state}</button>)}</div><p>{selectedState}: state-law coverage not collected. Federal-law records are tracked separately.</p>
      {stats && <><h3>Imported source records by U.S. Code title</h3><div className="title-bars">{stats.titles.map(title => <div key={title.title_number}><span>Title {title.title_number}</span><meter min={0} max={max} value={title.count} aria-label={'Title ' + title.title_number + ' source records'} /><strong>{title.count.toLocaleString()}</strong></div>)}</div></>}
      <p className="muted">Geographic boundary maps and jurisdiction-by-jurisdiction difference graphs remain planned. They will use collected applicability data rather than infer it from text matches.</p>
    </section>
    <section className="section-card"><h2>AI research assistant</h2><p>{stats?.agent_configured ? 'A local model is configured. Answers are research drafts with tool traces.' : 'AI is not connected. Configure a local Ollama model with tool support to use this assistant.'}</p><p>The assistant can search, open sources, compare wording, and inspect consolidation and coverage. It cannot rewrite source laws or enact changes.</p>
      <form onSubmit={e => { e.preventDefault(); task(async () => setAgent(await api<Agent>('agent', { prompt }))); }}><label htmlFor="law-ai">Research question</label><textarea id="law-ai" value={prompt} maxLength={4000} onChange={e => setPrompt(e.target.value)} required /><button disabled={busy || !stats?.agent_configured}>Research with AI</button></form>
      {agent && <><p><strong>{agent.status}</strong></p><div className="agent-answer">{agent.answer}</div><details><summary>Research tool trace</summary>{agent.trace.map((step, index) => <p key={index}>{step.tool}: {JSON.stringify(step.arguments)}</p>)}</details></>}
    </section>
    {busy && <p role="status">Working…</p>}{error && <p role="alert" className="error-message">{error}</p>}<p role="status">{message}</p>
  </Layout>;
}
