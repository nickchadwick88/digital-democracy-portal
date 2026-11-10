import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
export default function AccessCenters() {
  return <Layout title="Access and participation" subtitle="Participation should be possible regardless of device, ability, or connection.">
    <p className="version-notice">This project has no operating civic centers or verified kiosk network yet. The access methods below describe the proposed design.</p>
    <div className="feature-grid">{[
      ['Your own device', 'The demo works on desktop and phone browsers. No account or personal identification is required to explore it.'],
      ['Assisted participation', 'The proposed system would offer accessible kiosks and trained assistance while protecting a participant’s private decisions.'],
      ['Offline resilience', 'Offline credentials, delayed synchronization and recovery procedures require dedicated security engineering and testing.'],
    ].map(([title, text]) => <section className="section-card" key={title}><h2>{title}</h2><p>{text}</p></section>)}</div>
    <section className="section-card"><h2>Using this demo</h2><p>Navigate with Tab and activate links or buttons with Enter. Every form has labeled fields. You can enlarge text in Settings. Review the full proposal wording, record a decision, and export your work before leaving the device.</p><div className="editor-actions"><Link className="primary-link" to="/voting">Explore proposals</Link><Link className="action-link" to="/settings">Settings and backups →</Link></div></section>
  </Layout>;
}
