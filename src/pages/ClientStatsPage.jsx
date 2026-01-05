import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";

const numberFmt = (value, decimals = 2) => Number.parseFloat(value || 0).toFixed(decimals);

export default function ClientStatsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${baseUrl}/get-client-stats.php?id=${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Kon stats niet laden");
        setStats(data);
      } catch (err) {
        setError(err.message || "Onbekende fout");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Statistieken laden?</p>
        </section>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="space-y-6">
        <section className="terminal-card text-signal-red">
          <p className="tracking-[0.08em] uppercase">{error || "Niet gevonden"}</p>
          <div className="mt-4 flex gap-3">
            <TerminalBackButton to="/instellingen/klanten" label="Terug naar klanten" />
            <button type="button" className="terminal-button is-ghost text-xs" onClick={() => navigate(-1)}>
              Vorige
            </button>
          </div>
        </section>
      </main>
    );
  }

  const weightKg = (stats.total_weight_g || 0) / 1000;

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Klantstatistieken</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">{stats.client?.naam || 'Klant'}{stats.client?.bedrijf ? ` / ${stats.client.bedrijf}` : ''}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <TerminalBackButton label="Terug naar klanten" to="/instellingen/klanten" />
          </div>
        </div>
        <p className="text-sm text-gridline/70">Overzicht van offertes, omzet en filamentverbruik. BTW: {stats.client?.btw_nummer || 'onbekend'}.</p>
      </header>

      <section className="terminal-card space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Offertes" value={stats.quote_count} suffix=" st." />
          <Stat label="Omzet incl. btw" value={numberFmt(stats.total_bruto)} suffix=" EUR" />
          <Stat label="Netto" value={numberFmt(stats.total_netto)} suffix=" EUR" />
          <Stat label="BTW" value={numberFmt(stats.total_btw)} suffix=" EUR" />
          <Stat label="Filament verbruikt" value={numberFmt(weightKg)} suffix=" kg" />
          <Stat label="Items" value={stats.total_items || 0} suffix=" st." />
        </div>
        {stats.last_quote_date && (
          <p className="terminal-note">Laatste offerte: {stats.last_quote_date}</p>
        )}
      </section>

      <section className="terminal-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Recente offertes</h2>
          <span className="terminal-pill text-xs tracking-[0.12em]">Top 10</span>
        </div>
        {(!stats.recent_quotes || stats.recent_quotes.length === 0) ? (
          <p className="terminal-note">Geen offertes gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-gridline/70">
                  <th className="pb-2 pr-4 font-medium">ID</th>
                  <th className="pb-2 pr-4 font-medium">Datum</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium text-right">Totaal incl.</th>
                  <th className="pb-2 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gridline/30">
                {stats.recent_quotes.map((q) => (
                  <tr key={q.id}>
                    <td className="py-3 pr-4">#{q.id}</td>
                    <td className="py-3 pr-4">{q.datum}</td>
                    <td className="py-3 pr-4">{q.status}</td>
                    <td className="py-3 pr-4 text-right">{numberFmt(q.totaal_bruto)} EUR</td>
                    <td className="py-3 pr-4 text-right">
                      <Link to={`/offertes/${q.id}`} className="terminal-button is-ghost text-xs tracking-[0.12em]">
                        Bekijk
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div className="rounded-card border border-gridline/50 bg-parchment/80 p-4 shadow-terminal-inset space-y-1">
      <p className="terminal-label">{label}</p>
      <p className="text-xl font-semibold tracking-[0.1em] text-base-soft">{value}{suffix || ""}</p>
    </div>
  );
}
