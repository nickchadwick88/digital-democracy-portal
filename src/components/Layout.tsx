import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";

type LayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function Layout({ title, subtitle, children }: LayoutProps) {
  const location = useLocation();

  useEffect(() => { document.title = `${title} · Digital Democracy`; }, [title]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname, location.search]);
  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/voting", label: "Voting" },
    { to: "/laws", label: "Law research" },
    { to: "/payment", label: "Your Income Portal" },
    { to: "/history", label: "Your vote history" },
    { to: "/access", label: "Access" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
      <Link className="portal-brand" to="/" aria-label="Digital Democracy home"><span className="brand-symbol">DD</span> Digital Democracy <span className="review-badge">Review edition</span></Link>
      <header className="topbar">
        <div>
          <div className="eyebrow">Digital Democracy Prototype</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                key={item.to}
                to={item.to}
                className={active ? "nav-link nav-link-active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main-content" className="page-content"><p className="demo-notice">Interactive demo · One local participant · Saved in this browser only. No verified identity or real public votes.</p>{children}</main><footer className="portal-footer"><span>Built for participation. Designed to keep evolving.</span><Link to="/settings" className="action-link">Your data and backups</Link></footer>
    </div>
  );
}