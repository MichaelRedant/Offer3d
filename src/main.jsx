import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Globale fetch-wrapper om Authorization header toe te voegen
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey && typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
    // CSRF header verwacht dezelfde key
    if (!headers.has('X-CSRF')) {
      headers.set('X-CSRF', apiKey);
    }
    return originalFetch(input, { ...init, headers });
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LockedApp />
  </StrictMode>,
);

// Zorg dat oude service workers (die caching veroorzaken) niet actief blijven in dev
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister().catch(() => {}));
  });
}

function LockedApp() {
  const viewPassword = import.meta.env.VITE_APP_VIEW_PASSWORD;
  const [unlocked, setUnlocked] = useState(!viewPassword);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!viewPassword) return;
    const saved = sessionStorage.getItem('offr3d_view_token');
    if (saved && saved === viewPassword) {
      setUnlocked(true);
    }
  }, [viewPassword]);

  const submit = (event) => {
    event.preventDefault();
    if (!viewPassword) {
      setUnlocked(true);
      return;
    }
    if (value === viewPassword) {
      sessionStorage.setItem('offr3d_view_token', viewPassword);
      setUnlocked(true);
      setError('');
    } else {
      setError('Onjuist wachtwoord.');
    }
  };

  if (unlocked) return <App />;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-800/80 shadow-2xl backdrop-blur p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Beveiligd</p>
          <h1 className="text-2xl font-semibold">Voer wachtwoord in</h1>
          <p className="text-sm text-slate-300">Deze preview is afgeschermd. Vul het gedeelde wachtwoord in om verder te gaan.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.16em] text-slate-300" htmlFor="preview-pass">
              Wachtwoord
            </label>
            <input
              id="preview-pass"
              type="password"
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 focus:outline-none focus:ring focus:ring-sky-500/40"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 transition px-4 py-2 font-semibold shadow-md"
          >
            Ontgrendel
          </button>
        </form>
      </div>
    </div>
  );
}
