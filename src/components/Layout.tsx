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
    { to: "/", label: "Overview" },
    { to: "/voting", label: "Voting" },
    { to: "/payment", label: "Payment" },
    { to: "/proposal/P-2041", label: "Proposal" },
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

      <main className="page-content">{children}</main>
    </div>
  );
}