import { Link } from "react-router-dom";

export default function VotingPortal() {
  return (
    <div style={{padding:"40px"}}>
      <h1>Public Decisions</h1>

      <p>Review and vote on active proposals.</p>

      <ul>
        <li><Link to="/proposal/P-2041">Proposal P-2041</Link></li>
        <li><Link to="/proposal/P-2038">Proposal P-2038</Link></li>
        <li><Link to="/proposal/P-2045">Proposal P-2045</Link></li>
      </ul>
    </div>
  );
}
