import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const STATUS_OPTIONS = ["draft", "ready", "sent", "delivered", "accepted", "paid", "failed", "cancelled"];

function formatCurrency(value) {
  return `${Number.parseFloat(value || 0).toFixed(2)} EUR`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_API_KEY;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState("draft");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const buildKeyParam = () => (apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "");
  const handleDownloadPdf = () => window.open(`${baseUrl}/generate-invoice-pdf.php?id=${id}${buildKeyParam()}`, "_blank");
  const handleDownloadXml = () => window.open(`${baseUrl}/generate-invoice-xml.php?id=${id}${buildKeyParam()}`, "_blank");
  const handleEdit = () => navigate(`/factuur?edit=${id}`);
  const handleDelete = async () => {
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
      navigate("/facturen");
    } catch (error) {
      setStatusMessage({ type: "error", message: error?.message || "Verwijderen mislukt." });
    }
  };

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(`${baseUrl}/get-invoice-detail.php?id=${id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Factuur niet gevonden.");
        }
        const result = await response.json();
        if (result?.error) {
          throw new Error(result.error);
        }
        setData(result);
        setInvoiceStatus(result?.invoice?.status ?? "draft");
      } catch (error) {
        setData({ error: error.message || "Factuur niet gevonden." });
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const metrics = useMemo(() => {
    if (!data?.invoice) return [];
    const inv = data.invoice;
    return [
      { label: "Factuur", value: inv.invoice_number },
      { label: "Datum", value: inv.issue_date ? dateFormatter.format(new Date(inv.issue_date)) : "-" },
      { label: "Vervaldatum", value: inv.due_date ? dateFormatter.format(new Date(inv.due_date)) : "-" },
      { label: "BTW", value: `${Number.parseFloat(inv.vat_rate ?? 0).toFixed(1)}%` },
      { label: "Excl. btw", value: formatCurrency(inv.total_excl) },
      { label: "Incl. btw", value: formatCurrency(inv.total_incl) },
    ];
  }, [data]);

  const handleStatusChange = async (nextStatus) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`${baseUrl}/update-invoice-status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Status bijwerken mislukt.");
      }
      setInvoiceStatus(result.status);
      setStatusMessage({ type: "success", message: `Status gewijzigd naar ${result.status}.` });
    } catch (error) {
      setStatusMessage({ type: "error", message: error?.message || "Status bijwerken mislukt." });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Factuur laden?</p>
        </section>
      </main>
    );
  }

  if (!data || data.error) {
    return (
      <main className="space-y-6">
        <section className="terminal-card text-signal-red">
          <p className="tracking-[0.08em] uppercase">{data?.error || "Factuur niet gevonden."}</p>
          <div className="mt-4">
            <TerminalBackButton to="/facturen" label="Terug naar overzicht" />
          </div>
        </section>
      </main>
    );
  }

  const { invoice, customer, supplier } = data;
  const items = data.items || [];
  const normalizedCustomer = {
    name: customer?.name || customer?.klant_naam || "",
    company: customer?.company || customer?.klant_bedrijf || "",
    email: customer?.email || customer?.klant_email || "",
    street: customer?.street || "",
    postalCode: customer?.postalCode || customer?.postal_code || "",
    city: customer?.city || "",
    countryCode: customer?.countryCode || customer?.country_code || "",
    vatNumber: customer?.vatNumber || customer?.btw_nummer || "",
  };
  const supplierIban = supplier?.iban || "-";
  const supplierBic = supplier?.bic || "";

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Factuur detail</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">{invoice.invoice_number}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="terminal-pill text-xs tracking-[0.12em]">Status: {invoiceStatus}</span>
            {invoice.quote_id && (
              <Link to={`/offertes/${invoice.quote_id}`} className="terminal-button is-ghost text-xs tracking-[0.12em]">
                Bekijk offerte
              </Link>
            )}
            <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={handleEdit}>
              Bewerk
            </button>
            <button type="button" className="terminal-button is-danger text-xs tracking-[0.12em]" onClick={handleDelete}>
              Verwijder
            </button>
            <TerminalBackButton to="/facturen" label="Terug naar overzicht" />
            <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={handleDownloadPdf}>
              PDF
            </button>
            <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={handleDownloadXml}>
              XML
            </button>
          </div>
        </div>
        <p className="text-sm text-gridline/70">
          Inzage in klant- en betalingsgegevens. Werk statussen bij of download PDF/XML.
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusChange(status)}
              className={`terminal-button is-ghost text-xs tracking-[0.12em] ${invoiceStatus === status ? "border-primary/70 text-primary" : ""}`}
              disabled={updatingStatus}
            >
              {status}
            </button>
          ))}
        </div>
      </header>

      {statusMessage && (
        <div
          className={`terminal-card text-sm tracking-[0.08em] ${
            statusMessage.type === "success"
              ? "border border-signal-green/60 bg-signal-green/10 text-signal-green"
              : "border border-signal-red/60 bg-signal-red/10 text-signal-red"
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      <section className="terminal-card space-y-4">
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Samenvatting</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-card border border-gridline/50 bg-parchment-light/80 p-4 shadow-terminal-inset space-y-1"
            >
              <p className="terminal-label">{metric.label}</p>
              <p className="text-base font-semibold tracking-[0.1em] text-base-soft">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-card space-y-3 text-sm text-gridline/80">
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Klantinformatie</h2>
        <p>
          <span className="font-semibold">Klant:</span> {normalizedCustomer.name || "Onbekend"}
          {normalizedCustomer.company ? ` / ${normalizedCustomer.company}` : ""}
        </p>
        {normalizedCustomer.email && (
          <p>
            <span className="font-semibold">E-mail:</span> {normalizedCustomer.email}
          </p>
        )}
        {normalizedCustomer.street && (
          <p>
            <span className="font-semibold">Adres:</span> {normalizedCustomer.street}, {normalizedCustomer.postalCode} {normalizedCustomer.city} ({normalizedCustomer.countryCode})
          </p>
        )}
        {normalizedCustomer.vatNumber && (
          <p>
            <span className="font-semibold">BTW:</span> {normalizedCustomer.vatNumber}
          </p>
        )}
      </section>

      <section className="terminal-card space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Items</h2>
          <p className="text-sm text-gridline/70">Detailoverzicht van alle factuurlijnen.</p>
        </div>

        {items.length === 0 ? (
          <p className="terminal-note">Geen items gekoppeld.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <article
                key={item.id ?? index}
                className="rounded-card border border-gridline/50 bg-parchment/80 p-4 space-y-2 shadow-terminal-inset"
              >
                <header className="flex flex-wrap items-center gap-3 justify-between">
                  <h3 className="text-lg font-semibold tracking-dial uppercase">
                    {String(index + 1).padStart(2, "0")}. {item.description}
                  </h3>
                  <span className="terminal-pill">{item.quantity} stuks</span>
                </header>

                <ul className="text-sm text-gridline/80 space-y-1">
                  <li>
                    <span className="font-semibold">Prijs per stuk:</span> {formatCurrency(item.unit_price)}
                  </li>
                  <li>
                    <span className="font-semibold">Subtotaal:</span> {formatCurrency(item.line_extension_amount)}
                  </li>
                  <li>
                    <span className="font-semibold">BTW:</span> {Number.parseFloat(item.vat_rate ?? 0).toFixed(1)}%
                  </li>
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="terminal-card space-y-3 text-sm text-gridline/80">
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Betaling</h2>
        <p>
          <span className="font-semibold">Referentie:</span> {invoice.payment_reference || invoice.invoice_number}
        </p>
        <p>
          <span className="font-semibold">IBAN:</span> {supplierIban}
          {supplierBic ? ` (BIC ${supplierBic})` : ""}
        </p>
        {invoice.vat_exempt ? (
          <p>
            <span className="font-semibold">BTW:</span> Vrijgesteld (0%) {invoice.vat_exempt_reason ? `- ${invoice.vat_exempt_reason}` : ""}
          </p>
        ) : (
          <p>
            <span className="font-semibold">BTW tarief:</span> {Number.parseFloat(invoice.vat_rate ?? 0).toFixed(1)}%
          </p>
        )}
        {invoice.payment_terms && (
          <p>
            <span className="font-semibold">Betaalvoorwaarden:</span> {invoice.payment_terms}
          </p>
        )}
      </section>
    </main>
  );
}
