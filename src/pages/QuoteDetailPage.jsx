import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";
import { SettingsContext } from "../context/SettingsContext";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatCurrency(value) {
  return `${Number.parseFloat(value || 0).toFixed(2)} EUR`;
}

function CreateInvoiceModal({ isOpen, onClose, quoteId, settings, onSuccess, customer }) {
  const [form, setForm] = useState({
    invoiceNumber: "",
    issueDate: "",
    dueDate: "",
    paymentReference: "",
    buyerReference: "",
    paymentTerms: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    const dueDays = Number(settings?.defaultDueDays ?? 14);
    const dueDateObj = new Date(today);
    dueDateObj.setDate(dueDateObj.getDate() + dueDays);
    const suggestedNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}-${String(quoteId).padStart(4, "0")}`;
    setForm({
      invoiceNumber: suggestedNumber,
      issueDate: isoToday,
      dueDate: dueDateObj.toISOString().slice(0, 10),
      paymentReference: suggestedNumber,
      buyerReference: `QUOTE-${quoteId}`,
      paymentTerms: settings?.paymentTerms ?? "",
    });
    setError(null);
  }, [isOpen, quoteId, settings]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (!customer || !customer.street || !customer.postal_code || !customer.city || !customer.country_code) {
      setError("Klantadres onvolledig: vul straat, postcode, stad en land in bij de klant.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        quote_id: Number(quoteId),
        invoice_number: form.invoiceNumber || undefined,
        issue_date: form.issueDate,
        due_date: form.dueDate,
        payment_reference: form.paymentReference || undefined,
        buyer_reference: form.buyerReference || undefined,
        payment_terms: form.paymentTerms || undefined,
      };

      const res = await fetch(`${baseUrl}/create-invoice-from-quote.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Aanmaken factuur mislukt.");
      }

      if (typeof onSuccess === "function") {
        onSuccess(data.invoice_id);
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Kon factuur niet aanmaken.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="terminal-card w-full max-w-xl space-y-4 shadow-terminal-glow">
        <header className="space-y-2">
          <p className="terminal-section-title">Factuur genereren</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Maak factuur van offerte #{quoteId}</h2>
        </header>

        {error && <p className="text-sm text-signal-red tracking-[0.08em]">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input name="invoiceNumber" label="Factuurnummer" value={form.invoiceNumber} onChange={handleChange} required />
            <Input name="buyerReference" label="Buyer reference" value={form.buyerReference} onChange={handleChange} required />
            <Input name="issueDate" label="Factuurdatum" type="date" value={form.issueDate} onChange={handleChange} required />
            <Input name="dueDate" label="Vervaldatum" type="date" value={form.dueDate} onChange={handleChange} required />
            <Input name="paymentReference" label="Betalingsreferentie" value={form.paymentReference} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="terminal-label" htmlFor="paymentTerms">
              Betaalvoorwaarden
            </label>
            <textarea
              id="paymentTerms"
              name="paymentTerms"
              value={form.paymentTerms}
              onChange={handleChange}
              className="terminal-input min-h-[120px]"
              placeholder="Te betalen binnen 14 dagen…"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="terminal-button is-ghost" onClick={onClose} disabled={saving}>
              Annuleren
            </button>
            <button type="submit" className="terminal-button is-accent" disabled={saving}>
              {saving ? "Aanmaken…" : "Factuur aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ name, label, value, onChange, type = "text", required = false }) {
  return (
    <div className="space-y-2">
      <label className="terminal-label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="terminal-input"
      />
    </div>
  );
}

export default function QuoteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { settings } = useContext(SettingsContext);
  const apiKey = import.meta.env.VITE_API_KEY;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("draft");
  const [deleting, setDeleting] = useState(false);
  const [events, setEvents] = useState([]);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const handleDownloadPdf = () => {
    const keyParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "";
    const url = `${baseUrl}/generate-quote-pdf.php?id=${id}${keyParam}`;
    window.open(url, "_blank");
  };

  async function fetchEvents(quoteId) {
    try {
      const res = await fetch(`${baseUrl}/get-quote-events.php?quote_id=${quoteId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (error) {
      // stilzwijgend falen
    }
  }

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(`${baseUrl}/get-quote-detail.php?id=${id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Offerte niet gevonden.");
        }
        const result = await response.json();
        if (result?.error) {
          throw new Error(result.error);
        }
        setData(result);
        setQuoteStatus(result?.offerte?.status || "draft");
        fetchEvents(id);
      } catch (error) {
        console.error("Fout bij laden offerte:", error);
        setData({ error: error.message || "Offerte niet gevonden." });
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  const metrics = useMemo(() => {
    if (!data?.offerte) return [];
    const { offerte } = data;
    return [
      { label: "Offertenummer", value: `#${offerte.id}` },
      {
        label: "Offertedatum",
        value: dateFormatter.format(new Date(offerte.datum)),
      },
      {
        label: "BTW",
        value: `${Number.parseFloat(offerte.btw_perc ?? 21).toFixed(1)}%`,
      },
      {
        label: "Korting",
        value: `${Number.parseFloat(offerte.korting_perc ?? 0).toFixed(1)}%`,
      },
      {
        label: "Netto (excl. btw)",
        value: formatCurrency(offerte.totaal_netto),
      },
      {
        label: "Totaal (incl. btw)",
        value: formatCurrency(offerte.totaal_bruto),
      },
    ];
  }, [data]);

  const klantAdresCompleet =
    data?.offerte?.street && data.offerte.postal_code && data.offerte.city && data.offerte.country_code;
  const klantAdresStatus = klantAdresCompleet
    ? { label: "Adres compleet", tone: "success" }
    : { label: "Adres onvolledig (straat/postcode/stad/land vereist)", tone: "error" };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Weet je zeker dat je offerte #${id} wilt verwijderen?`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      const response = await fetch(`${baseUrl}/delete-quote.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Verwijderen mislukt.");
      }
      navigate("/offertes");
    } catch (error) {
      console.error("Fout bij verwijderen offerte:", error);
      setStatusMessage({ type: "error", message: error?.message || "Verwijderen mislukt." });
      setDeleting(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    try {
      const response = await fetch(`${baseUrl}/update-quote-status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Status bijwerken mislukt.");
      }
      setQuoteStatus(result.status);
      setStatusMessage({ type: "success", message: `Status gewijzigd naar ${result.status}.` });
      fetchEvents(id);
    } catch (error) {
      console.error("Fout bij status update:", error);
      setStatusMessage({ type: "error", message: error.message || "Status bijwerken mislukt." });
    }
  };

  const handleInvoiceCreated = (invoiceId) => {
    navigate(`/facturen/${invoiceId}`);
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Offertegegevens laden…</p>
        </section>
      </main>
    );
  }

  if (!data || data.error) {
    return (
      <main className="space-y-6">
        <section className="terminal-card text-signal-red">
          <p className="tracking-[0.08em] uppercase">
            {data?.error || "Offerte niet gevonden."}
          </p>
          <div className="mt-4">
            <TerminalBackButton to="/offertes" label="Terug naar overzicht" />
          </div>
        </section>
      </main>
    );
  }

  const { offerte, items } = data;

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Offerte detail</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">
              Offerte #{offerte.id}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="terminal-pill text-xs tracking-[0.12em]">
              Status: {quoteStatus}
            </span>
            <TerminalBackButton to="/offertes" label="Terug naar overzicht" />
            <Link
              to={`/offerte?edit=${offerte.id}`}
              className="terminal-button is-ghost text-xs tracking-[0.12em]"
            >
              Bewerk
            </Link>
            <button
              type="button"
              className="terminal-button is-accent text-xs tracking-[0.12em]"
              onClick={() => setIsInvoiceModalOpen(true)}
            >
              Maak factuur
            </button>
            <button
              type="button"
              className="terminal-button is-danger text-xs tracking-[0.12em]"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Verwijderen…" : "Verwijder"}
            </button>
          </div>
        </div>
        <p className="text-sm text-gridline/70">
          Inzage in klantinformatie, printstukken en kostopbouw. Gebruik de actieknoppen om de
          offerte te bewerken of te verwijderen.
        </p>
        <div className="flex flex-wrap gap-2">
          {["draft", "review", "verstuurd", "geaccepteerd", "afgewezen"].map((statusValue) => (
            <button
              key={statusValue}
              type="button"
              onClick={() => handleStatusChange(statusValue)}
              className={`terminal-button is-ghost text-xs tracking-[0.12em] ${
                quoteStatus === statusValue ? "border-primary/70 text-primary" : ""
              }`}
            >
              {statusValue}
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
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Samenvatting
        </h2>
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
        {offerte?.vat_exempt ? (
          <p className="terminal-note text-signal-amber">
            BTW vrijgesteld (0%){offerte.vat_exempt_reason ? ` - ${offerte.vat_exempt_reason}` : ""}
          </p>
        ) : null}
      </section>

      <section className="terminal-card space-y-3 text-sm text-gridline/80">
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Klantinformatie
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`terminal-pill text-xs tracking-[0.12em] ${
              klantAdresCompleet ? "text-signal-green border-signal-green/60" : "text-signal-amber border-signal-amber/60"
            }`}
          >
            {klantAdresCompleet ? "Adres compleet" : "Adres onvolledig (straat/postcode/stad/land vereist)"}
          </span>
          {!klantAdresCompleet && (
            <Link to="/instellingen/klanten" className="terminal-button is-ghost text-xs tracking-[0.12em]">
              Klant bewerken
            </Link>
          )}
        </div>
        <p>
          <span className="font-semibold">Klant:</span> {offerte.klant_naam}
          {offerte.klant_bedrijf ? ` / ${offerte.klant_bedrijf}` : ""}
        </p>
        {offerte.klant_email && (
          <p>
            <span className="font-semibold">E-mail:</span> {offerte.klant_email}
          </p>
        )}
        {offerte.adres && (
          <p>
            <span className="font-semibold">Adres:</span> {offerte.adres}
          </p>
        )}
        {offerte.telefoon && (
          <p>
            <span className="font-semibold">Telefoon:</span> {offerte.telefoon}
          </p>
        )}
      </section>

      <section className="terminal-card space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Printstukken
          </h2>
          <p className="text-sm text-gridline/70">
            Detailoverzicht van alle items die in deze offerte zijn opgenomen.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="terminal-note">Geen printstukken gekoppeld aan deze offerte.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <article
                key={item.id ?? index}
                className="rounded-card border border-gridline/50 bg-parchment/80 p-4 space-y-2 shadow-terminal-inset"
              >
                <header className="flex flex-wrap items-center gap-3 justify-between">
                  <h3 className="text-lg font-semibold tracking-dial uppercase">
                    {String(index + 1).padStart(2, "0")}. {item.naam}
                  </h3>
                  <span className="terminal-pill">{item.aantal} stuks</span>
                </header>

                <ul className="text-sm text-gridline/80 space-y-1">
                  <li>
                    <span className="font-semibold">Filament:</span>{" "}
                    {item.materiaal_naam
                      ? `${item.materiaal_naam} (${item.materiaal_type || "?"}, ${item.materiaal_kleur || "?"})`
                      : "Onbekend"}
                  </li>
                  <li>
                    <span className="font-semibold">Gewicht:</span> {item.gewicht_g} g
                  </li>
                  <li>
                    <span className="font-semibold">Printtijd:</span>{" "}
                    {Math.floor(item.printtijd_seconden / 3600)}u{" "}
                    {Math.floor((item.printtijd_seconden % 3600) / 60)}m
                  </li>
                  {item.verkoopprijs_per_stuk > 0 && (
                    <li>
                      <span className="font-semibold">Prijs per stuk:</span>{" "}
                      {formatCurrency(item.verkoopprijs_per_stuk)}
                    </li>
                  )}
                  <li>
                    <span className="font-semibold">Subtotaal:</span>{" "}
                    {formatCurrency(item.subtotaal)}
                  </li>
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="terminal-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Historiek
          </h2>
          <span className="terminal-note">{events.length} events</span>
        </div>
        {events.length === 0 ? (
          <p className="terminal-note">Nog geen events geregistreerd.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((evt) => (
              <li
                key={evt.id}
                className="rounded-card border border-gridline/50 bg-base-soft/15 p-3 flex justify-between gap-3 text-sm text-base-soft"
              >
                <div className="space-y-1">
                  <p className="uppercase tracking-[0.12em] text-gridline/70">{evt.status}</p>
                  {evt.message && <p className="text-gridline/80">{evt.message}</p>}
                </div>
                <span className="terminal-note">{evt.created_at}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        quoteId={id}
        settings={settings}
        onSuccess={handleInvoiceCreated}
        customer={offerte}
      />
    </main>
  );
}
