import { Link } from "react-router-dom";
import CivicGraphic from "../components/CivicGraphic";

export default function LandingPage() {
  return (
    <div className="lp-shell">
      <header className="lp-topbar">
        <div className="lp-brand">
          <div className="lp-brand-mark">DD</div>
          <div>
            <div className="lp-brand-title">Digital Democracy</div>
            <div className="lp-brand-subtitle">Participation Platform</div>
          </div>
        </div>

        <div className="lp-top-actions">
          <Link to="/dashboard" className="lp-text-link">
            Open Dashboard
          </Link>
          <Link to="/auth" className="lp-pill-button">
            Explore the Demo
          </Link>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <div className="lp-hero-left">
            <div className="lp-eyebrow">Future-facing civic participation</div>

            <h1 className="lp-title">
              Prepare to participate in the future of collective decision-making
            </h1>

            <p className="lp-subtitle">
              Transparent public decisions and human-centered economic
              coordination built for real participation.
            </p>

            <div className="lp-hero-actions">
              <Link to="/auth" className="lp-primary-button">
                Explore the Demo
              </Link>
              <Link to="/auth" className="lp-secondary-button">
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="lp-hero-right">
            <div className="lp-line lp-line-1" />
            <div className="lp-line lp-line-2" />

            <div className="lp-circle lp-circle-main">
              <CivicGraphic />
            </div>

            <div className="lp-circle lp-circle-top">
              <CivicGraphic variant="trust" />
            </div>

            <div className="lp-circle lp-circle-bottom">
              <CivicGraphic variant="growth" />
            </div>

            <div className="lp-number lp-number-1">01</div>
            <div className="lp-number lp-number-2">02</div>
          </div>
        </section>

        <section className="lp-portal-row">
          <Link to="/voting" className="lp-portal-card">
            <div className="lp-portal-copy">
              <h2>Voting Portal</h2>
              <p>
                Help shape public decisions through proposals, review,
                discussion, and voting.
              </p>
            </div>
            <div className="lp-portal-visual"><CivicGraphic /></div>
          </Link>

          <Link to="/payment" className="lp-portal-card">
            <div className="lp-portal-copy">
              <h2>Your Income Portal</h2>
              <p>
                Understand participation, contributions, and the shared
                economic system with greater transparency.
              </p>
            </div>
            <div className="lp-portal-visual"><CivicGraphic variant="growth" /></div>
          </Link>
        </section>

        <section className="lp-mission-row">
          <p className="lp-mission-text">
            This platform is designed to make participation clear, trustworthy,
            and visible — from proposals and public decisions to shared
            economic coordination.
          </p>
        </section>

        <section className="lp-info-grid">
          <Link to="/access" className="lp-info-card">
            <h3>Learn to Participate</h3>
            <p>
              Understand how proposals, review, voting, and participation work.
            </p>
          </Link>

          <Link to="/about" className="lp-info-card">
            <h3>About the Project</h3>
            <p>
              Explore the mission, philosophy, and long-term vision behind the
              platform.
            </p>
          </Link>

          <Link to="/access" className="lp-info-card">
            <h3>Public Access</h3>
            <p>
              Find civic centers, kiosks, and support pathways for in-person
              participation.
            </p>
          </Link>
        </section>
        <footer className="portal-footer"><span>Interactive review edition · Your demo data stays in your browser.</span><Link className="action-link" to="/settings">Settings and backups</Link></footer>
      </main>
    </div>
  );
}