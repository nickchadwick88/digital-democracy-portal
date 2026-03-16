import { Link } from "react-router-dom";

export default function AuthPage() {
  return (
    <div style={{padding:"40px"}}>
      <h1>Create Your Secure Civic Identity</h1>

      <p>
        Prepare to participate in the future of collective decision-making.
      </p>

      <div style={{marginTop:"20px"}}>
        <input placeholder="Full Name" />
      </div>

      <div style={{marginTop:"10px"}}>
        <input placeholder="Email" />
      </div>

      <div style={{marginTop:"10px"}}>
        <input placeholder="Password" type="password" />
      </div>

      <div style={{marginTop:"20px"}}>
        <Link to="/dashboard">Create Account</Link>
      </div>
    </div>
  );
}
