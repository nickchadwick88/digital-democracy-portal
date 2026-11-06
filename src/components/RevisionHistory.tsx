import { Link } from 'react-router-dom';
import type { Proposal } from '../data/proposals';
import { useParticipation } from './ParticipationContext';
export default function RevisionHistory({ versions, selected }: { versions: Proposal[]; selected: number }) {
  const { state } = useParticipation();
  const latest = versions.at(-1)!;
  return <section className="revision-history"><h2>Revision history</h2><p>Every published version remains available, with the vote you recorded on it.</p>
    <ol className="history-list">{versions.toReversed().map(version => {
      const revision = state.revisions.find(r => r.proposalId === version.id && r.version === version.version);
      const previous = versions.find(p => p.version === version.version - 1);
      return <li className="section-card" key={version.version}>
        <h3><Link className="action-link" aria-current={version.version === selected ? 'page' : undefined} to={`/proposal/${version.id}?version=${version.version}`}>Version {version.version}</Link> {version.version === latest.version ? '· Latest' : '· Archived'}</h3>
        <p>{revision?.note ?? 'Original proposal wording.'}</p>{revision && <time dateTime={revision.at}>{new Date(revision.at).toLocaleString()}</time>}
        {previous && <details><summary>Compare wording with version {previous.version}</summary>{version.sections.filter((s, i) => s.text !== previous.sections[i]?.text).map(section => <div className="wording-comparison" key={section.id}><h4>{section.title}</h4><p><strong>Previous wording</strong></p><p className="wording previous-wording">{previous.sections.find(s => s.id === section.id)?.text}</p><p><strong>New wording</strong></p><p className="wording new-wording">{section.text}</p></div>)}</details>}
      </li>;
    })}</ol>
  </section>;
}
