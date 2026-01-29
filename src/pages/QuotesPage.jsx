import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { baseUrl } from "../lib/constants";

import TerminalBackButton from "../components/TerminalBackButton";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function formatCurrency(value) {
  return `${Number.parseFloat(value || 0).toFixed(2)} EUR`;
}

function getStatusMeta(status) {
  const labels = {
    draft: "Concept",
    review: "Review",
    verstuurd: "Verstuurd",
    geaccepteerd: "Geaccepteerd",
    afgewezen: "Afgewezen",
  };
  const tones = {
    draft: "border-gridline/50 text-base-soft",
    review: "border-primary/60 text-primary",
    verstuurd: "border-accent/60 text-accent",
    geaccepteerd: "border-signal-green/60 text-signal-green",
    afgewezen: "border-signal-red/60 text-signal-red",
  };
  return {
    label: labels[status] || labels.draft,
    className: tones[status] || tones.draft,
  };
}

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const apiKey = import.meta.env.VITE_API_KEY;

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const response = await fetch(`${baseUrl}/get-quotes.php`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Netwerkfout");
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setQuotes(data);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error("Fout bij ophalen offertes:", error);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchQuotes();
  }, []);

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      const matchesQuery =
        !query ||
        quote.klant_naam?.toLowerCase().includes(query) ||
        quote.bedrijf?.toLowerCase().includes(query) ||
        String(quote.id).includes(query);
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [search, quotes, statusFilter]);

  const handleDelete = async (quote) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je offerte #${quote.id} voor ${quote.klant_naam} wilt verwijderen?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(quote.id);
      setStatus(null);
      const response = await fetch(`${baseUrl}/delete-quote.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: quote.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Verwijderen mislukt.");
      }

      setQuotes((prev) => prev.filter((item) => item.id !== quote.id));
      setStatus({ type: "success", message: `Offerte #${quote.id} succesvol verwijderd.` });
    } catch (error) {
      console.error("Fout bij verwijderen offerte:", error);
      setStatus({
        type: "error",
        message: error?.message || "Er ging iets mis bij het verwijderen.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (id) => navigate(`/offertes/${id}`);
  const handleEdit = (id) => navigate(`/offerte?edit=${id}`);
  const handleDownloadPdf = (id) => {
    const keyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "";
    window.open(`${baseUrl}/generate-quote-pdf.php?id=${id}${keyParam}`, "_blank");
  };

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Archief</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase text-base-soft">
              Offertes
            </h1>
          </div>
          <TerminalBackButton label="Terug naar dashboard" to="/" />
        </div>
        <p className="text-sm text-gridline/70">
          Doorzoek opgeslagen offertes, bekijk details of voer snelle acties uit.
        </p>
      </header>

      <section className="terminal-card space-y-5">
        <div className="space-y-2">
          <label htmlFor="quoteSearch" className="terminal-label">
            Zoek op klant, bedrijf of nummer
          </label>
          <input
            id="quoteSearch"
            type="text"
            placeholder="Bijv. 'Acme', '1234', 'Jansen'…"
            className="terminal-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>



        <div className="space-y-2">
          <label htmlFor="statusFilter" className="terminal-label">
            Status
          </label>
          <select
            id="statusFilter"
            className="terminal-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Alle statussen</option>
            <option value="draft">Concept</option>
            <option value="review">Review</option>
            <option value="verstuurd">Verstuurd</option>
            <option value="geaccepteerd">Geaccepteerd</option>
            <option value="afgewezen">Afgewezen</option>
          </select>
        </div>

        <div className="min-h-[60px]">
          {status && (
            <StatusBanner
              type={status.type}
              message={status.message}
              onDismiss={() => setStatus(null)}
            />
          )}
        </div>

        {loading ? (
          <p className="terminal-note">Offertes worden geladen…</p>
        ) : hasError ? (
          <p className="text-signal-red text-sm tracking-[0.08em]">
            Er is een fout opgetreden bij het ophalen van de offertes.
          </p>
        ) : filteredQuotes.length === 0 ? (
          <p className="terminal-note">Geen offertes gevonden voor deze zoekterm.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gridline/30 rounded-card overflow-hidden">
              <thead className="bg-parchment/80 text-xs uppercase tracking-[0.12em] text-gridline/70">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Klant</th>
                  <th className="px-4 py-3 text-left">Bedrijf</th>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Totaal (incl.)</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gridline/20 text-sm text-base-soft">
                {filteredQuotes.map((quote) => {
                  const statusMeta = getStatusMeta(quote.status);
                  return (
                    <tr key={quote.id} className="hover:bg-parchment/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gridline/80">#{quote.id.toString().padStart(4, "0")}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold tracking-[0.05em]">{quote.klant_naam || "Onbekend"}</div>
                        {quote.klant_email && <div className="text-xs text-gridline/70">{quote.klant_email}</div>}
                      </td>
                      <td className="px-4 py-3 text-gridline/80">{quote.bedrijf || "—"}</td>
                      <td className="px-4 py-3 text-gridline/80">{dateFormatter.format(new Date(quote.datum))}</td>
                      <td className="px-4 py-3">
                        <span className={`terminal-pill text-xs ${statusMeta.className}`}>{statusMeta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(quote.totaal_bruto)}</td>
                      <td className="px-4 py-3 text-right text-gridline/80">{quote.item_count ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="terminal-button is-ghost text-xs"
                            onClick={() => handleView(quote.id)}
                          >
                            Bekijk
                          </button>
                          <button
                            type="button"
                            className="terminal-button is-ghost text-xs"
                            onClick={() => handleEdit(quote.id)}
                          >
                            Bewerk
                          </button>
                          <button
                            type="button"
                            className="terminal-button is-ghost text-xs"
                            onClick={() => handleDownloadPdf(quote.id)}
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            className="terminal-button is-danger text-xs"
                            onClick={() => handleDelete(quote)}
                            disabled={deletingId === quote.id}
                          >
                            {deletingId === quote.id ? "…" : "Verwijder"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const STATUS_TONES = {
  success: {
    container: "border-signal-green/60 bg-signal-green/15",
    text: "text-signal-green",
  },
  error: {
    container: "border-signal-red/60 bg-signal-red/15",
    text: "text-signal-red",
  },
  info: {
    container: "border-primary/60 bg-primary/10",
    text: "text-primary",
  },
};

function StatusBanner({ type = "info", message, onDismiss }) {
  const tone = STATUS_TONES[type] ?? STATUS_TONES.info;
  return (
    <div className={`rounded-card border ${tone.container} p-4 flex items-start justify-between gap-4`}>
      <p className={`text-sm tracking-[0.08em] ${tone.text}`}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="terminal-button is-ghost text-xs tracking-[0.12em]"
      >
        Sluiten
      </button>
    </div>
  );
}
