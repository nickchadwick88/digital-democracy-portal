import { Link } from "react-router-dom";
import Layout from "../components/Layout";
export default function DashboardPage() {
  return <Layout title="Your participation dashboard" subtitle="Take part in the decisions that shape our shared future."><div className="proposal-grid">
    <article className="proposal-card"><h2>Public decisions</h2><p>Explore proposals, read their wording, and record or update your vote.</p><Link className="action-link" to="/voting">Open voting portal →</Link></article>
    <article className="proposal-card"><h2>Your vote history</h2><p>See the latest vote and earlier changes for each proposal version.</p><Link className="action-link" to="/history">Review your decisions →</Link></article>
    <article className="proposal-card"><h2>Your Income Portal</h2><p>The income demonstration will follow the NBPA specification work.</p><Link className="action-link" to="/payment">Open income portal →</Link></article>
  </div></Layout>;
}
