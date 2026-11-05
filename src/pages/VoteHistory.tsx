import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useParticipation } from "../components/ParticipationContext";
import { latestVote } from "../data/participation";
import { allProposals } from "../data/proposalModel";
export default function VoteHistory() {
  const { state, error } = useParticipation();
  const proposals = allProposals(state);
  return <Layout title="Your vote history" subtitle="A record of your decisions and changes on this device.">
    {error && <p role="alert" className="error-message">{error}</p>}
    <p className="muted">This is an editable local demo record, not a secure or independently verified ballot receipt.</p>
    {!state.votes.length ? <div className="empty-state"><h2>Your participation starts here</h2><p>You have not voted yet.</p><Link className="action-link" to="/voting">Explore public decisions →</Link></div> :
      <ol className="history-list">{state.votes.toReversed().map(v => <li key={v.id} className="section-card">
        <div className="card-meta"><span>{latestVote(state.votes, v.proposalId, v.version)?.id === v.id ? (proposals.find(p => p.id === v.proposalId)?.version === v.version ? "Current vote" : "Latest vote on archived version") : "Previous vote"}</span><time dateTime={v.at}>{new Date(v.at).toLocaleString()}</time></div>
        <h2><Link to={`/proposal/${v.proposalId}?version=${v.version}`}>{proposals.find(p => p.id === v.proposalId)?.title ?? v.proposalId}</Link></h2><p><strong>{v.choice}</strong> · {v.proposalId} · Version {v.version}</p>
      </li>)}</ol>}
  </Layout>;
}
