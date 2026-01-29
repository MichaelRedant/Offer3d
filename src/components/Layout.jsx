import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import QuoteModeModal from "./QuoteModeModal";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/offerte", label: "Nieuwe Offerte" },
  { to: "/offertes", label: "Offertes" },
  { to: "/facturen", label: "Facturen" },
  { to: "/projecten", label: "Projecten" },
  { to: "/materialen", label: "Filamentbeheer" },
  { to: "/instellingen/klanten", label: "Klanten" },
  { to: "/instellingen", label: "Instellingen" },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const openQuoteModal = () => setIsQuoteModalOpen(true);
  const closeQuoteModal = () => setIsQuoteModalOpen(false);
  const goToQuoteMode = (mode) => {
    setIsQuoteModalOpen(false);
    if (mode === "manual") {
      navigate("/offerte/handmatig");
    } else {
      navigate(`/offerte?mode=${mode}`);
    }
  };

  return (
    <div className="terminal-shell">
      <header className="terminal-topbar">
        <div className="terminal-topbar__brand">
          <span className="terminal-topbar__led" aria-hidden="true" />
          <span className="terminal-topbar__label">Offr3D Console</span>
          <span className="terminal-topbar__path">{location.pathname}</span>
        </div>

        <nav className="terminal-topbar__nav" aria-label="Hoofdmenu">
          {NAV_LINKS.map((link) => {
            if (link.to === "/offerte") {
              const isActive = location.pathname.startsWith("/offerte");
              return (
                <button
                  key={link.to}
                  type="button"
                  onClick={openQuoteModal}
                  className={`terminal-topbar__link${isActive ? " is-active" : ""}`}
                >
                  {link.label}
                </button>
              );
            }

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) => `terminal-topbar__link${isActive ? " is-active" : ""}`}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <div className="terminal-page crt-fade-in">{children}</div>
      {isQuoteModalOpen && (
        <QuoteModeModal
          onClose={closeQuoteModal}
          onSelectPrint={() => goToQuoteMode("print")}
          onSelectManual={() => goToQuoteMode("manual")}
        />
      )}
    </div>
  );
}
