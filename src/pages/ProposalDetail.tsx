import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import RevisionEditor from '../components/RevisionEditor';
import RevisionHistory from '../components/RevisionHistory';
import SectionReview from '../components/SectionReview';
import { useParticipation } from '../components/ParticipationContext';
import { latestVote } from '../data/participation';
import { findBaseProposal, proposalVersions } from '../data/proposalModel';
import type { VoteChoice } from '../data/participation';
export default function ProposalDetail() {
  const { id } = useParams(), [params] = useSearchParams();
  const { state, error, castVote } = useParticipation();
  const [notice, setNotice] = useState('');
  const base = findBaseProposal(state, id ?? '');
  const versions = base ? proposalVersions(state, base) : [];
  const latest = versions.at(-1);
  const requested = params.has('version') ? Number(params.get('version')) : latest?.version;
  const proposal = versions.find(p => p.version === requested);
  if (!base || !proposal || !latest) return <Layout title="Proposal or version not found" subtitle="This proposal version is not available in the demo."><Link className="action-link" to="/voting">Browse proposals</Link></Layout>;
  const archived = proposal.version !== latest.version;
  const current = latestVote(state.votes, proposal.id, proposal.version);
  return <Layout title={proposal.title} subtitle={`${proposal.id} · ${proposal.category} · Version ${proposal.version}`}>
    <Link className="action-link" to="/voting">← All proposals</Link><p className="proposal-intro">{proposal.summary}</p>
    {proposal.sourceLaw && <section className="section-card"><h2>Source law and amendment snapshot</h2><p>{proposal.sourceLaw.citation} · source release {proposal.sourceLaw.release} · amendment draft version {proposal.sourceLaw.amendmentVersion}</p><p className="source-reference">Source ID: {proposal.sourceLaw.sourceId}<br />Original text SHA-256: {proposal.sourceLaw.textHash}</p><Link className="action-link" to={'/law-explorer?source=' + encodeURIComponent(proposal.sourceLaw.sourceId)}>Open the pinned source and amendment history</Link><p className="muted">This is a demo proposal based on a saved amendment draft. Proposal revisions are separate from that draft snapshot. Voting here does not enact or alter a law.</p></section>}
    {archived && <p className="version-notice" role="status">Archived version — voting and suggestions are closed on this snapshot. <Link className="action-link" to={`/proposal/${proposal.id}`}>Review latest version {latest.version} →</Link></p>}
    {!archived && latest.version > 1 && !current && <p className="version-notice">The wording has changed. Earlier votes do not apply to version {latest.version}. Please review and vote again.</p>}
    <div className="detail-grid"><div><h2>Proposal wording</h2>
      {proposal.sections.map(section => <SectionReview key={`${proposal.id}-${proposal.version}-${section.id}`} proposal={proposal} section={section} archived={archived} />)}
    </div><aside className="vote-panel"><span className="small-label">Your decision</span><h2>{archived ? `Your vote on version ${proposal.version}` : `Vote on version ${proposal.version}`}</h2>
      {!archived && <><p>Your vote applies to the complete wording shown here. You can change it anytime in this demo.</p><fieldset><legend>Choose your vote</legend>{(['Support', 'Oppose', 'Abstain'] as VoteChoice[]).map(choice => <button type="button" key={choice} aria-pressed={current?.choice === choice} className={current?.choice === choice ? 'selected-vote' : ''} onClick={() => { setNotice(''); if (castVote(proposal.id, proposal.version, choice)) setNotice(`${choice} saved for version ${proposal.version}.`); }}>{choice}{current?.choice === choice ? ' ✓' : ''}</button>)}</fieldset></>}
      <p>{archived ? 'Recorded vote' : 'Current vote'}: <strong>{current?.choice ?? 'Not voted'}</strong></p><Link className="action-link" to="/history">View your vote history →</Link>
    </aside></div>
    <RevisionHistory versions={versions} selected={proposal.version} />
    {!archived && <RevisionEditor key={`${base.id}-${latest.version}`} base={base} current={latest} />}
    <p className="status-message" role="status">{notice}</p>{error && <p className="error-message" role="alert">{error}</p>}
  </Layout>;
}
