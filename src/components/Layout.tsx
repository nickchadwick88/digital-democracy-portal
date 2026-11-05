import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type LayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function Layout({ title, subtitle, children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/voting", label: "Voting" },
    { to: "/payment", label: "Your Income Portal" },
    { to: "/history", label: "Your vote history" },
    { to: "/access", label: "Access" },
  ];

  return (
    <div className="app-shell">
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

      <main className="page-content"><p className="demo-notice">Interactive demo · One local participant · Saved in this browser only. No verified identity or real public votes.</p>{children}</main>
    </div>
  );
}