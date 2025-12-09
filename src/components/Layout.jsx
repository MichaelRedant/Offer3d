import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/offerte", label: "Nieuwe Offerte" },
  { to: "/offertes", label: "Offertes" },
  { to: "/instellingen", label: "Instellingen" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "default");

  useEffect(() => {
    document.documentElement.classList.toggle("theme-hawkins", theme === "hawkins");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="terminal-shell">
      <header className="terminal-topbar">
        <div className="terminal-topbar__brand">
          <span className="terminal-topbar__led" aria-hidden="true" />
          <span className="terminal-topbar__label">Offr3D Console</span>
          <span className="terminal-topbar__path">{location.pathname}</span>
        </div>

        <nav className="terminal-topbar__nav" aria-label="Hoofdmenu">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) =>
                `terminal-topbar__link${isActive ? " is-active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="terminal-input w-auto text-[0.75rem] px-2 py-1"
          >
            <option value="default">Default Theme</option>
            <option value="hawkins">Hawkins Synth</option>
          </select>
        </nav>
      </header>

      <div className="terminal-page crt-fade-in">{children}</div>
    </div>
  );
}
