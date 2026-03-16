import { Link } from "react-router-dom";

export default function DashboardPage() {
  return (
    <div style={{padding:"40px"}}>
      <h1>Your Participation Dashboard</h1>

      <p>Your participation helps guide collective outcomes.</p>

      <div style={{marginTop:"30px"}}>
        <Link to="/voting">Open Public Decisions</Link>
      </div>

      <div style={{marginTop:"10px"}}>
        <Link to="/payment">Open Shared Resources</Link>
      </div>
    </div>
  );
}
