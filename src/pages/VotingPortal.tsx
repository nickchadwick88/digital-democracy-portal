import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { allProposals } from "../data/proposalModel";
import { useParticipation } from "../components/ParticipationContext";
import { latestVote } from "../data/participation";
export default function VotingPortal() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const { state, error } = useParticipation();
  const proposals = allProposals(state);
  const term = query.trim().toLowerCase();
  const visible = proposals.filter(p => (category === "All" || p.category === category) && `${p.id} ${p.title} ${p.summary}`.toLowerCase().includes(term));
  return <Layout title="Public decisions" subtitle="Read the wording. Consider the tradeoffs. Make your voice count.">
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="portal-actions"><Link className="primary-link" to="/proposal/new">Create a proposal</Link></div>
    {state.drafts.length > 0 && <section className="section-card"><h2>Your saved drafts</h2><ul>{state.drafts.map(d => <li key={d.id}><Link className="action-link" to={`/draft/${d.id}`}>{d.title.trim() || 'Untitled draft'}</Link></li>)}</ul></section>}
    <div className="filters">
      <label>Search proposals<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by topic or proposal ID" /></label>
      <label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{["All", ...new Set(proposals.map(p => p.category))].map(c => <option key={c}>{c}</option>)}</select></label>
    </div>
    <p className="result-count" role="status">{visible.length} proposal{visible.length !== 1 ? "s" : ""} found</p>
    <div className="proposal-grid">{visible.map(p => <article className="proposal-card" key={p.id}>
      <div className="card-meta"><span>{p.category}</span><span>{p.id} · v{p.version}</span></div>
      <h2><Link to={`/proposal/${p.id}`}>{p.title}</Link></h2><p>{p.summary}</p>
      <div className="card-footer"><span>Your vote: <strong>{latestVote(state.votes, p.id, p.version)?.choice ?? "Not voted"}</strong></span><Link className="action-link" to={`/proposal/${p.id}`}>Review proposal →</Link></div>
    </article>)}</div>
    {!visible.length && <div className="empty-state"><h2>No matching proposals</h2><p>Try another topic or clear your filters.</p><button onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
  </Layout>;
}
