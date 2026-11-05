import { useState } from 'react';
import type { Proposal } from '../data/proposals';
import type { SectionChoice } from '../data/participation';
import { useParticipation } from './ParticipationContext';
export default function SectionReview({ proposal, section, archived }: { proposal: Proposal; section: Proposal['sections'][number]; archived: boolean }) {
  const { state, suggest, reviewSection } = useParticipation();
  const [draft, setDraft] = useState(''), [quote, setQuote] = useState(''), [message, setMessage] = useState('');
  const current = state.sectionReviews.findLast(r => r.proposalId === proposal.id && r.version === proposal.version && r.sectionId === section.id);
  const captureSelection = () => {
    const selection = window.getSelection();
    if (selection?.toString() && selection.toString().length <= 2000) setQuote(selection.toString());
  };
  return <section className="section-card"><h3>{section.title}</h3><p className="wording selectable-wording" onMouseUp={captureSelection} onKeyUp={captureSelection} tabIndex={0}>{section.text}</p>
    {!archived && <><fieldset className="section-choices"><legend>Your section preference</legend>{(['Keep', 'Revise', 'Remove'] as SectionChoice[]).map(choice => <button key={choice} type="button" className={current?.choice === choice ? 'selected-section' : 'secondary-button'} aria-pressed={current?.choice === choice} onClick={() => { if (reviewSection(proposal.id, proposal.version, section.id, choice)) setMessage(`${choice} preference saved for ${section.title}.`); }}>{choice === 'Keep' ? 'Keep as written' : choice === 'Revise' ? 'Request changes' : 'Prefer removal'}</button>)}</fieldset>
    <p className="muted">Section preferences are separate from your whole-proposal vote. They do not remove wording from a published version.</p>
    <details><summary>Suggest a change to this section</summary><form onSubmit={e => { e.preventDefault(); if (suggest(proposal.id, proposal.version, section.id, draft, quote)) { setDraft(''); setQuote(''); setMessage(`Suggestion saved for ${section.title}.`); } }}>
      <label htmlFor={`quote-${section.id}`}>Quoted wording (optional)</label><input id={`quote-${section.id}`} maxLength={2000} value={quote} onChange={e => setQuote(e.target.value)} /><p className="muted">Select words above to quote them, or type the wording here.</p>
      <label htmlFor={`suggest-${section.id}`}>Your suggested wording or explanation</label><textarea id={`suggest-${section.id}`} required maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} /><button type="submit">Save suggestion</button>
    </form></details></>}
    {archived && current && <p className="muted">Your recorded section preference: {current.choice}</p>}
    {state.suggestions.filter(s => s.proposalId === proposal.id && s.version === proposal.version && s.sectionId === section.id).map(s => <blockquote key={s.id}><span className="small-label">Your suggestion · version {s.version}</span>{s.quote && <p><q>{s.quote}</q></p>}<p>{s.text}</p></blockquote>)}
    <p className="inline-status" role="status">{message}</p>
  </section>;
}
