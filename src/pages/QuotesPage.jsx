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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredQuotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDownloadPdf={handleDownloadPdf}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function QuoteCard({ quote, onView, onEdit, onDelete, deletingId, onDownloadPdf }) {
  const isDeleting = deletingId === quote.id;
  const statusLabels = {
    draft: "Concept",
    review: "Review",
    verstuurd: "Verstuurd",
    geaccepteerd: "Geaccepteerd",
    afgewezen: "Afgewezen",
  };
  const statusTone = {
    draft: "border-gridline/50 text-base-soft",
    review: "border-primary/60 text-primary",
    verstuurd: "border-accent/60 text-accent",
    geaccepteerd: "border-signal-green/60 text-signal-green",
    afgewezen: "border-signal-red/60 text-signal-red",
  };
  const statusClass = statusTone[quote.status] || statusTone.draft;
  return (
    <article className="rounded-card border border-gridline/40 bg-parchment/95 p-5 shadow-terminal hover:-translate-y-1 hover:shadow-terminal-glow transition-transform duration-200 ease-out text-base-soft">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="terminal-section-title">#{quote.id.toString().padStart(4, "0")}</p>
          <h2 className="text-lg font-semibold tracking-[0.1em] uppercase text-base-soft">
            {quote.klant_naam}
          </h2>
          {quote.bedrijf && (
            <p className="text-xs tracking-[0.08em] text-gridline/70">{quote.bedrijf}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="terminal-pill text-base-soft">{dateFormatter.format(new Date(quote.datum))}</span>
          <span className={`terminal-pill text-xs tracking-[0.12em] ${statusClass}`}>
            {statusLabels[quote.status] || "Concept"}
          </span>
        </div>
      </header>

      <dl className="mt-4 space-y-1 text-xs tracking-[0.08em] text-gridline/90">
        <div className="flex justify-between gap-3">
          <dt>Items</dt>
          <dd>{quote.item_count ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Totaal (incl. btw)</dt>
          <dd className="text-primary font-semibold">{formatCurrency(quote.totaal_bruto)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Korting</dt>
          <dd>{Number.parseFloat(quote.korting_perc ?? 0).toFixed(1)}%</dd>
        </div>
      </dl>

      <footer className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="terminal-button is-ghost text-xs tracking-[0.12em]"
          onClick={() => onView(quote.id)}
        >
          Bekijk
        </button>
        <button
          type="button"
          className="terminal-button is-ghost text-xs tracking-[0.12em]"
          onClick={() => onEdit(quote.id)}
        >
          Bewerk
        </button>
        <button
          type="button"
          className="terminal-button is-ghost text-xs tracking-[0.12em]"
          onClick={() => onDownloadPdf(quote.id)}
        >
          PDF
        </button>
        <button
          type="button"
          className="terminal-button is-danger text-xs tracking-[0.12em]"
          onClick={() => onDelete(quote)}
          disabled={isDeleting}
        >
          {isDeleting ? "Verwijderen…" : "Verwijder"}
        </button>
      </footer>
    </article>
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
