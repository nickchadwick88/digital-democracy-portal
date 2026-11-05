import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Proposal } from '../data/proposals';
import { useParticipation } from './ParticipationContext';
export default function RevisionEditor({ base, current }: { base: Proposal; current: Proposal }) {
  const { revise } = useParticipation();
  const navigate = useNavigate();
  const [sections, setSections] = useState(() => current.sections.map(s => ({ ...s })));
  const [note, setNote] = useState('');
  return <details className="section-card revision-editor"><summary>Create a demo revision</summary>
    <p>This simulates publishing new wording. It is not an approved amendment. Earlier versions and votes remain unchanged.</p>
    <form onSubmit={e => { e.preventDefault(); if (revise(base, current.version, sections, note)) navigate(`/proposal/${base.id}`); }}>
      {sections.map((section, i) => <div key={section.id}><label htmlFor={`revise-${section.id}`}>{section.title}</label><textarea id={`revise-${section.id}`} required maxLength={10000} value={section.text} onChange={e => setSections(sections.map((s, j) => j === i ? { ...s, text: e.target.value } : s))} /></div>)}
      <label htmlFor="revision-note">Why is the wording changing?</label><textarea id="revision-note" required minLength={5} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /><button type="submit">Publish demo version {current.version + 1}</button>
    </form>
  </details>;
}
