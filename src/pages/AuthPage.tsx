import { Link } from "react-router-dom";
import Layout from "../components/Layout";
export default function AuthPage() {
  return <Layout title="Explore participation" subtitle="Prepare to participate in the future of collective decision-making."><section className="section-card"><h2>Try the local demonstration</h2><p>Account creation and identity verification are not connected yet. No name, email, or password is needed. Your demo votes and suggestions stay in this browser.</p><Link className="primary-link" to="/dashboard">Enter demo dashboard</Link></section></Layout>;
}
