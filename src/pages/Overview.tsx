import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function Overview() {
  return (
    <Layout
      title="Civic Democracy Dashboard"
      subtitle="A shared portal for governance, policy review, civic payment, and public access."
    >
      <div className="card-grid">
        <div className="card">
          <h3>Voting Portal</h3>
          <p>Proposal creation, revisions, deliberation, and line-by-line voting.</p>
        </div>

        <div className="card">
          <h3>Payment Portal</h3>
          <p>Need-based payment visibility, contribution logs, and algorithm controls.</p>
        </div>

        <div className="card">
          <h3>Proposal Review</h3>
          <p>Detailed section review, counterpoints, simulation outputs, and audits.</p>
        </div>

        <div className="card">
          <h3>Access Network</h3>
          <p>Public kiosks, civic centers, and support channels for in-person participation.</p>
        </div>
      </div>

      <div className="link-row">
        <Link className="inline-link" to="/voting">Open Voting Portal</Link>
        <Link className="inline-link" to="/payment">Open Payment Portal</Link>
        <Link className="inline-link" to="/proposal/P-2041">Open Proposal Detail</Link>
        <Link className="inline-link" to="/access">Open Access Centers</Link>
      </div>
    </Layout>
  );
}