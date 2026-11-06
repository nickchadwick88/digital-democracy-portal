import { useState } from 'react';
import Layout from '../components/Layout';
import { digitizeLaw, lawIdentity, lawStorageKey, readLawBackup } from '../data/lawModel';
import type { LawInput, LawRecord } from '../data/lawModel';
import './LawLibrary.css';
const blank = (): LawInput => ({ title: '', jurisdiction: '', citation: '', topic: '', effectiveDate: '', sourceUrl: '', sourceFileName: '', originalText: '', method: 'Pasted text' });
export default function LawLibrary() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(lawStorageKey);
      return { raw, pending: raw ? true : false };
    } catch { return { raw: null, pending: false }; }
  });
  const [laws, setLaws] = useState<LawRecord[]>([]), [loaded, setLoaded] = useState(!initial.pending);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(''), [jurisdiction, setJurisdiction] = useState('All');
  const [selected, setSelected] = useState<string | null>(null), [input, setInput] = useState(blank);
  const [reviewed, setReviewed] = useState(false), [showImport, setShowImport] = useState(false);
  const [lastRaw, setLastRaw] = useState<string | null>(initial.raw);
  async function load() {
    try { const records = await readLawBackup(initial.raw!); setLaws(records); setLoaded(true); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'The saved library could not be read.'); }
  }
  function save(records: LawRecord[]) {
    try {
      if (!loaded) throw new Error('Open the saved library before adding records.');
      if (localStorage.getItem(lawStorageKey) !== lastRaw) throw new Error('The library changed in another tab. Reload before saving.');
      const raw = JSON.stringify({ format: 'digital-democracy-law-library', version: 1, records });
      localStorage.setItem(lawStorageKey, raw); setLastRaw(raw); setLaws(records); setError(''); return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'The library could not be saved.'); return false; }
  }
  async function importText() {
    setBusy(true); setError(''); setMessage('');
    try {
      const record = await digitizeLaw(input);
      if (laws.some(law => lawIdentity(law) === lawIdentity(record))) throw new Error('This citation and exact source text are already in the library.');
      if (save([...laws, record])) { setSelected(record.id); setReviewed(false); setInput(blank()); setShowImport(false); setMessage('Source imported. Its transcription still needs review.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); }
    finally { setBusy(false); }
  }
  function exportLibrary() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'digital-democracy-law-library', version: 1, records: laws }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'digital-democracy-law-library.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visible = laws.filter(law => (jurisdiction === 'All' || jurisdiction === law.jurisdiction) && [law.title, law.citation, law.topic, law.jurisdiction, law.originalText].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const active = laws.find(law => law.id === selected);
  const field = (key: keyof LawInput, label: string, maxLength = 160, type = 'text') => <label key={key} htmlFor={'law-' + key}>{label}<input id={'law-' + key} type={type} maxLength={maxLength} required={['title', 'jurisdiction', 'citation'].includes(key)} value={input[key]} onChange={e => setInput({ ...input, [key]: e.target.value })} /></label>;
  return <Layout title="Law Library" subtitle="Bring existing law into a searchable collection, with its source and wording preserved.">
    <p className="demo-notice">Local repository · Imported text is not automatically verified or current law. Transcription review is distinct from legal validation. Proposed amendments must remain separate.</p>
    {!loaded && <section className="section-card"><h2>Open your saved library</h2><p>Check source records and their checksums before loading them.</p><button onClick={() => void load()}>Open saved law library</button></section>}
    <div className="portal-actions"><button disabled={!loaded} onClick={() => setShowImport(!showImport)}>{showImport ? 'Close import' : 'Digitize a law'}</button><button className="secondary-button" disabled={!loaded || !laws.length} onClick={exportLibrary}>Export law library</button></div>
    {showImport && <section className="section-card law-import"><h2>Import a source document</h2><p>Paste its exact text or choose a UTF-8 text file. Add the jurisdiction and citation so the text can be traced back to its source. Record a correction or later edition as a separate import.</p>
      <label htmlFor="law-source-file">Source text or library backup</label><input id="law-source-file" type="file" accept=".txt,.md,.json,text/plain,application/json" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return; setError(''); setMessage('');
        try {
          if (file.size > 2 * 1024 * 1024) throw new Error('Choose a file smaller than 2 MB.');
          const raw = await file.text();
          if (file.name.toLowerCase().endsWith('.json')) {
            const incoming = await readLawBackup(raw);
            const keys = new Set(laws.map(lawIdentity)), ids = new Set(laws.map(law => law.id));
            const additions = incoming.filter(law => !keys.has(lawIdentity(law))).map(law => ids.has(law.id) ? { ...law, id: crypto.randomUUID() } : law);
            if (save([...laws, ...additions])) setMessage(additions.length + ' source records added. Existing records were preserved.');
          } else { setInput({ ...input, originalText: raw, sourceFileName: file.name, method: 'Text file' }); }
        } catch (problem) { setError(problem instanceof Error ? problem.message : 'The file could not be read.'); }
      }} />
      <form onSubmit={e => { e.preventDefault(); void importText(); }}><div className="law-fields">{field('title', 'Law or document title')}{field('jurisdiction', 'Jurisdiction')}{field('citation', 'Citation or document reference')}{field('topic', 'Topic', 120)}{field('effectiveDate', 'Effective date (leave blank if unknown)', 10, 'date')}{field('sourceUrl', 'Official source URL (optional)', 2000, 'url')}</div>
        <label htmlFor="law-text">Original source text</label><textarea id="law-text" required minLength={20} maxLength={200000} value={input.originalText} onChange={e => setInput({ ...input, originalText: e.target.value })} /><p className="muted">The exact text is stored with a SHA-256 checksum. No summary replaces it.</p><button type="submit" disabled={busy}>{busy ? 'Importing…' : 'Add source to library'}</button>
      </form></section>}
    <div className="filters"><label htmlFor="law-search">Search laws<input id="law-search" type="search" placeholder="Title, citation, topic, or full text" value={query} onChange={e => setQuery(e.target.value)} /></label><label htmlFor="law-jurisdiction">Jurisdiction<select id="law-jurisdiction" value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}>{['All', ...new Set(laws.map(law => law.jurisdiction))].map(name => <option key={name}>{name}</option>)}</select></label></div>
    <p role="status" className="result-count">{visible.length} source record{visible.length === 1 ? '' : 's'}</p>
    <div className="law-workspace"><div>{visible.map(law => <article className="section-card" key={law.id}><div className="card-meta"><span>{law.jurisdiction}</span><span>{law.reviewStatus}</span></div><h2><button className="law-title" onClick={() => { setSelected(law.id); setReviewed(false); }}>{law.title}</button></h2><p>{law.citation}</p><p className="muted">{law.topic || 'Uncategorized'} · Effective date: {law.effectiveDate || 'Unknown'}</p></article>)}
      {!visible.length && <section className="empty-state"><h2>{laws.length ? 'No matching laws' : 'Start a source collection'}</h2><p>{laws.length ? 'Try another search or jurisdiction.' : 'Import an existing document to preserve its text and source details.'}</p></section>}</div>
    {active && <article className="section-card law-reader"><span className="small-label">Preserved source record</span><h2>{active.title}</h2><dl><dt>Jurisdiction</dt><dd>{active.jurisdiction}</dd><dt>Citation</dt><dd>{active.citation}</dd><dt>Effective date</dt><dd>{active.effectiveDate || 'Unknown — not established'}</dd><dt>Digitization</dt><dd>{active.method}{active.sourceFileName ? ' · ' + active.sourceFileName : ''}</dd><dt>Imported</dt><dd>{new Date(active.importedAt).toLocaleString()}</dd><dt>Review</dt><dd>{active.reviewStatus}</dd></dl>{active.sourceUrl && <p><a className="action-link" href={active.sourceUrl} target="_blank" rel="noopener noreferrer">Open source document ↗</a></p>}
      <details><summary>Source checksum</summary><code className="law-hash">{active.sourceSha256}</code></details>
      {active.sections.map(section => <section key={section.id}><h3>{section.heading}</h3><p className="wording">{section.text}</p></section>)}
      {active.reviewStatus === 'Needs review' && <div className="law-review"><label className="check-label"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I compared the transcription with its source</label><button disabled={!reviewed} onClick={() => { if (save(laws.map(law => law.id === active.id ? { ...law, reviewStatus: 'Transcription reviewed' } : law))) setMessage('Transcription review recorded. This does not certify legal validity or currency.'); }}>Record transcription review</button></div>}
      <p className="muted">Import does not enact, repeal, or amend any law. Later editions are separate source records.</p>
    </article>}</div>
    {error && <p role="alert" className="error-message">{error}</p>}<p role="status" className="inline-status">{message}</p>
  </Layout>;
}
