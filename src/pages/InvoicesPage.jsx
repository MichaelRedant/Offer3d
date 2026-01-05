import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function formatCurrency(value) {
  return `${Number.parseFloat(value || 0).toFixed(2)} EUR`;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Alle statussen" },
  { value: "draft", label: "Concept" },
  { value: "ready", label: "Klaar" },
  { value: "sent", label: "Verstuurd" },
  { value: "delivered", label: "Geleverd" },
  { value: "accepted", label: "Geaccepteerd" },
  { value: "paid", label: "Betaald" },
  { value: "failed", label: "Mislukt" },
  { value: "cancelled", label: "Geannuleerd" },
];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_API_KEY;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${baseUrl}/get-invoices.php`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Kon facturen niet ophalen");
        }
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || "Onbekende fout");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesQuery =
        !query ||
        (invoice.invoice_number ?? "").toLowerCase().includes(query) ||
        (invoice.client_name ?? "").toLowerCase().includes(query) ||
        (invoice.client_company ?? "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || (invoice.status ?? "").toLowerCase() === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleView = (id) => navigate(`/facturen/${id}`);
  const handleEdit = (id) => navigate(`/factuur?edit=${id}`);
  const handleDownloadPdf = (id) => {
    const keyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "";
    window.open(`${baseUrl}/generate-invoice-pdf.php?id=${id}${keyParam}`, "_blank");
  };
  const handleDownloadXml = (id) => {
    const keyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "";
    window.open(`${baseUrl}/generate-invoice-xml.php?id=${id}${keyParam}`, "_blank");
  };
  const handleDelete = async (id) => {
    if (!confirm("Factuur verwijderen?")) return;
    try {
      const res = await fetch(`${baseUrl}/delete-invoice.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (!res.ok || result.error || !result.success) {
        throw new Error(result.error || "Verwijderen mislukt.");
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setError(err.message || "Kon factuur niet verwijderen.");
    }
  };

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Facturatie</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">Facturen</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="terminal-button is-accent text-xs tracking-[0.12em]"
              onClick={() => navigate("/factuur")}
            >
              Nieuwe factuur
            </button>
            <TerminalBackButton label="Terug naar dashboard" to="/" />
          </div>
        </div>
        <p className="text-sm text-gridline/70">Overzicht van alle facturen met snelle acties.</p>
      </header>

      <section className="terminal-card space-y-5">
        <div className="space-y-2">
          <label htmlFor="invoiceSearch" className="terminal-label">
            Zoek op factuurnummer of klant
          </label>
          <input
            id="invoiceSearch"
            type="text"
            placeholder="Bijv. INV-2024 of bedrijfsnaam"
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
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="terminal-note">Facturen laden?</p>
        ) : error ? (
          <p className="text-signal-red text-sm tracking-[0.08em]">{error}</p>
        ) : filteredInvoices.length === 0 ? (
          <p className="terminal-note">Geen facturen gevonden voor deze filter.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDownloadPdf={handleDownloadPdf}
                onDownloadXml={handleDownloadXml}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InvoiceCard({ invoice, onView, onEdit, onDelete, onDownloadPdf, onDownloadXml }) {
  const statusLabel = (invoice.status ?? "").toLowerCase();
  const issueDate = invoice.issue_date ? dateFormatter.format(new Date(invoice.issue_date)) : "-";
  const dueDate = invoice.due_date ? dateFormatter.format(new Date(invoice.due_date)) : "-";

  return (
    <article className="rounded-card border border-gridline/40 bg-parchment/95 p-5 shadow-terminal hover:-translate-y-1 hover:shadow-terminal-glow transition-transform duration-200 ease-out text-base-soft">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="terminal-section-title">{invoice.invoice_number}</p>
          <h2 className="text-lg font-semibold tracking-[0.1em] uppercase text-base-soft">
            {invoice.client_name || "Onbekende klant"}
          </h2>
          {invoice.client_company && (
            <p className="text-xs tracking-[0.08em] text-gridline/70">{invoice.client_company}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="terminal-pill text-xs tracking-[0.12em]">{issueDate}</span>
          <span className="terminal-pill text-xs tracking-[0.12em]">Vervaldatum: {dueDate}</span>
          <span className="terminal-pill text-xs tracking-[0.12em]">Status: {statusLabel || "-"}</span>
        </div>
      </header>

      <dl className="mt-4 space-y-1 text-xs tracking-[0.08em] text-gridline/90">
        <div className="flex justify-between gap-3">
          <dt>Totaal (incl. btw)</dt>
          <dd className="text-primary font-semibold">{formatCurrency(invoice.total_incl)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>BTW</dt>
          <dd>{formatCurrency(invoice.total_vat)}</dd>
        </div>
      </dl>

      <footer className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={() => onView(invoice.id)}>
          Bekijk
        </button>
        <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={() => onEdit(invoice.id)}>
          Bewerk
        </button>
        <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={() => onDownloadPdf(invoice.id)}>
          PDF
        </button>
        <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={() => onDownloadXml(invoice.id)}>
          XML
        </button>
        <button type="button" className="terminal-button is-danger text-xs tracking-[0.12em]" onClick={() => onDelete(invoice.id)}>
          Verwijder
        </button>
      </footer>
    </article>
  );
}
