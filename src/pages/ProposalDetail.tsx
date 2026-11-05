import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { proposals } from "../data/proposals";
import { useParticipation } from "../components/ParticipationContext";
import { latestVote } from "../data/participation";
import type { VoteChoice } from "../data/participation";
export default function ProposalDetail() {
  const { id } = useParams();
  const proposal = proposals.find(p => p.id.toLowerCase() === id?.trim().toLowerCase());
  const { state, error, castVote, suggest } = useParticipation();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  if (!proposal) return <Layout title="Proposal not found" subtitle="This proposal ID is not available in the demo."><Link className="action-link" to="/voting">Browse proposals</Link></Layout>;
  const current = latestVote(state.votes, proposal.id, proposal.version);
  return <Layout title={proposal.title} subtitle={`${proposal.id} · ${proposal.category} · Version ${proposal.version}`}>
    <Link className="action-link" to="/voting">← All proposals</Link><p className="proposal-intro">{proposal.summary}</p>
    <div className="detail-grid"><div><h2>Proposal wording</h2>
      {proposal.sections.map(section => <section className="section-card" key={`${proposal.id}-${section.id}`}>
        <h3>{section.title}</h3><p>{section.text}</p>
        <details><summary>Suggest a change to this section</summary>
          <form onSubmit={e => { e.preventDefault(); if (suggest(proposal.id, proposal.version, section.id, drafts[section.id] ?? "")) { setDrafts({ ...drafts, [section.id]: "" }); setNotice(`Suggestion saved for ${section.title}.`); } }}>
            <label htmlFor={`suggest-${section.id}`}>Your suggested wording or explanation</label>
            <textarea id={`suggest-${section.id}`} required maxLength={2000} value={drafts[section.id] ?? ""} onChange={e => setDrafts({ ...drafts, [section.id]: e.target.value })} />
            <button type="submit">Save suggestion</button>
          </form>
        </details>
        {state.suggestions.filter(s => s.proposalId === proposal.id && s.version === proposal.version && s.sectionId === section.id).map(s => <blockquote key={s.id}><span className="small-label">Your suggestion · pending review</span><p>{s.text}</p></blockquote>)}
      </section>)}
      <p className="muted">Suggestions do not change this version or your vote. Amendment voting and revision publication are a later milestone.</p>
    </div><aside className="vote-panel">
      <span className="small-label">Your decision</span><h2>Vote on version {proposal.version}</h2>
      <p>Your vote applies to the complete wording shown here. You can change it anytime in this demo.</p>
      <fieldset><legend>Choose your vote</legend>{(["Support", "Oppose", "Abstain"] as VoteChoice[]).map(choice => <button type="button" key={choice} aria-pressed={current?.choice === choice} className={current?.choice === choice ? "selected-vote" : ""} onClick={() => { if (castVote(proposal.id, proposal.version, choice)) setNotice(`${choice} saved for ${proposal.id}, version ${proposal.version}.`); }}>{choice}{current?.choice === choice ? " ✓" : ""}</button>)}</fieldset>
      <p>Current vote: <strong>{current?.choice ?? "Not voted"}</strong></p><Link className="action-link" to="/history">View your vote history →</Link>
    </aside></div>
    <p className="status-message" role="status">{notice}</p>{error && <p className="error-message" role="alert">{error}</p>}
  </Layout>;
}
