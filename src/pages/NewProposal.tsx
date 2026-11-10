import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useParticipation } from '../components/ParticipationContext';
import { blankDraft, categories, draftError } from '../data/proposalModel';
import type { ProposalDraft } from '../data/proposalModel';
function DraftEditor({ initial }: { initial: ProposalDraft }) {
  const { state, error, saveDraft, submitDraft } = useParticipation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [validation, setValidation] = useState('');
  const change = (key: keyof ProposalDraft, value: string) => setDraft({ ...draft, [key]: value });
  return <Layout title={preview ? 'Review your proposal' : 'Create a proposal'} subtitle="Anyone can bring forward an idea. Clear wording makes it easier to review.">
    <Link className="action-link" to="/voting">← All proposals</Link>
    <p className="muted">Save a draft to keep your progress. Submitting adds it to this browser's demo, not a public service.</p>
    {preview ? <section className="section-card"><span className="small-label">{draft.category} · New proposal · Version 1</span><h2>{draft.title.trim()}</h2><p>{draft.summary.trim()}</p>
      {draft.text.trim().split(/\n\s*\n/).map((text, i) => <section key={i}><h3>Section {i + 1}</h3><p className="wording">{text}</p></section>)}
      <div className="editor-actions"><button onClick={() => setPreview(false)} className="secondary-button">Back to editing</button><button onClick={() => { const id = submitDraft(draft); if (id) navigate(`/proposal/${id}`); }}>Submit to demo</button></div>
    </section> : <form className="section-card proposal-form" onSubmit={e => { e.preventDefault(); const problem = draftError(draft, state); setValidation(problem); if (!problem) setPreview(true); }}>
      <label htmlFor="new-title">Title</label><input id="new-title" required minLength={5} maxLength={160} value={draft.title} onChange={e => change('title', e.target.value)} />
      <label htmlFor="new-category">Category</label><select id="new-category" value={draft.category} onChange={e => change('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select>
      <label htmlFor="new-summary">Summary</label><textarea id="new-summary" required minLength={10} maxLength={500} value={draft.summary} onChange={e => change('summary', e.target.value)} />
      <label htmlFor="new-wording">Proposal wording</label><p id="wording-help" className="muted">Describe the action and how it will be reviewed. Separate sections with a blank line.</p><textarea id="new-wording" aria-describedby="wording-help" required minLength={20} maxLength={10000} value={draft.text} onChange={e => change('text', e.target.value)} />
      <div className="editor-actions"><button type="button" className="secondary-button" onClick={() => { if (saveDraft(draft)) navigate(`/draft/${draft.id}`, { replace: true }); }}>Save draft</button><button type="submit">Review proposal</button></div>
      {state.drafts.some(d => d.id === draft.id) && <p className="muted">A saved copy of this draft is available. Save again to keep new edits.</p>}
    </form>}
    {validation && <p className="error-message" role="alert">{validation}</p>}{error && <p className="error-message" role="alert">{error}</p>}
  </Layout>;
}
export default function NewProposal() {
  const { id } = useParams();
  const { state } = useParticipation();
  const saved = state.drafts.find(d => d.id === id);
  if (id && !saved) return <Layout title="Draft not found" subtitle="This draft is not saved in this browser."><Link className="action-link" to="/voting">Return to proposals</Link></Layout>;
  return <DraftEditor key={id ?? 'new'} initial={saved ?? blankDraft()} />;
}
