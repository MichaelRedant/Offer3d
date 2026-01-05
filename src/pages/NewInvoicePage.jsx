import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ClientSelector from "../components/ClientSelector";
import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";

const emptyLine = { description: "", quantity: 1, unit_price: 0, vat_rate: 21 };

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({
    invoice_number: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    buyer_reference: "",
    payment_reference: "",
    payment_terms: "",
    vat_exempt: false,
    vat_exempt_reason: "",
  });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInvoice() {
      if (!editId) return;
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/get-invoice-detail.php?id=${editId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Kon factuur niet laden");
        setClient(data.customer || null);
        setForm((prev) => ({
          ...prev,
          invoice_number: data.invoice.invoice_number || "",
          issue_date: data.invoice.issue_date || prev.issue_date,
          due_date: data.invoice.due_date || "",
          buyer_reference: data.invoice.buyer_reference || "",
          payment_reference: data.invoice.payment_reference || "",
          payment_terms: data.invoice.payment_terms || "",
          vat_exempt: !!data.invoice.vat_exempt,
          vat_exempt_reason: data.invoice.vat_exempt_reason || "",
        }));
        setLines(
          (data.items || []).map((item) => ({
            description: item.description || "Item",
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            vat_rate: data.invoice.vat_exempt ? 0 : item.vat_rate || 0,
            unit_code: item.unit_code || "C62",
          })) || [{ ...emptyLine }]
        );
      } catch (err) {
        setError(err.message || "Kon factuur niet laden.");
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [editId]);

  const handleLineChange = (index, field, value) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const totalExcl = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0);

  const handleSubmit = async () => {
    setError(null);
    if (!client) {
      setError("Selecteer een klant.");
      return;
    }
    if (!lines.length || totalExcl <= 0) {
      setError("Voeg minstens een lijn toe met een waarde groter dan 0.");
      return;
    }
    if (!client.street || !client.postal_code || !client.city || !client.country_code) {
      setError("Klantadres onvolledig (straat/postcode/stad/land vereist).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editId ? Number(editId) : undefined,
        client_id: client.id,
        invoice_number: form.invoice_number || undefined,
        issue_date: form.issue_date,
        due_date: form.due_date || undefined,
        buyer_reference: form.buyer_reference || undefined,
        payment_reference: form.payment_reference || undefined,
        payment_terms: form.payment_terms || undefined,
        vat_exempt: form.vat_exempt,
        vat_exempt_reason: form.vat_exempt_reason || undefined,
        lines: lines.map((l) => ({
          description: l.description || "Item",
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          vat_rate: form.vat_exempt ? 0 : Number(l.vat_rate) || 0,
        })),
      };

      const endpoint = editId ? "update-invoice.php" : "save-invoice.php";
      const res = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || result.error || !result.success) {
        throw new Error(result.error || "Opslaan mislukt.");
      }
      navigate(`/facturen/${result.invoice_id || editId}`);
    } catch (err) {
      setError(err.message || "Onbekende fout.");
    } finally {
      setSaving(false);
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

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Facturatie</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">{editId ? "Factuur bewerken" : "Nieuwe factuur"}</h1>
          </div>
          <div className="flex gap-3">
            <TerminalBackButton to="/facturen" label="Terug naar facturen" />
          </div>
        </div>
        <p className="text-sm text-gridline/70">Maak een factuur zonder offerte. Klantadres en bedrijfsgegevens moeten volledig zijn voor XML/PDF.</p>
      </header>

      <section className="terminal-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="terminal-section-title">Klant</p>
            <p className="text-sm text-gridline/70">Selecteer een klant, je kunt via VIES/klantenbeheer adres aanvullen.</p>
          </div>
        </div>
        <ClientSelector selectedClient={client} setSelectedClient={setClient} />
        {client && (
          <p className="text-xs text-gridline/70">
            {client.street}, {client.postal_code} {client.city} ({client.country_code})
          </p>
        )}
      </section>

      <section className="terminal-card space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Factuurnummer" value={form.invoice_number} onChange={(e) => setForm((p) => ({ ...p, invoice_number: e.target.value }))} />
          <Input label="Factuurdatum" type="date" value={form.issue_date} onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))} />
          <Input label="Vervaldatum" type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
          <Input label="Buyer reference" value={form.buyer_reference} onChange={(e) => setForm((p) => ({ ...p, buyer_reference: e.target.value }))} />
          <Input label="Betalingsreferentie" value={form.payment_reference} onChange={(e) => setForm((p) => ({ ...p, payment_reference: e.target.value }))} />
          <div className="space-y-2">
            <label className="terminal-label">BTW-regeling</label>
            <select
              className="terminal-input"
              value={form.vat_exempt ? "exempt" : "standard"}
              onChange={(e) => setForm((p) => ({ ...p, vat_exempt: e.target.value === "exempt", vat_exempt_reason: p.vat_exempt_reason }))}
            >
              <option value="standard">Standaard btw</option>
              <option value="exempt">Vrijgesteld (0%)</option>
            </select>
          </div>
          {form.vat_exempt && (
            <Input label="Vrijstellingsreden" value={form.vat_exempt_reason} onChange={(e) => setForm((p) => ({ ...p, vat_exempt_reason: e.target.value }))} />
          )}
        </div>
        <div className="space-y-2">
          <label className="terminal-label" htmlFor="paymentTerms">Betaalvoorwaarden</label>
          <textarea
            id="paymentTerms"
            className="terminal-input min-h-[120px]"
            value={form.payment_terms}
            onChange={(e) => setForm((p) => ({ ...p, payment_terms: e.target.value }))}
            placeholder="Bijv. te betalen binnen 14 dagen via overschrijving"
          />
        </div>
      </section>

      <section className="terminal-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Lijnen</h2>
          <button type="button" className="terminal-button is-ghost text-xs" onClick={addLine}>
            + Lijn
          </button>
        </div>
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-2 md:grid-cols-5 items-end border border-gridline/40 rounded-card p-3">
              <Input label="Omschrijving" value={line.description} onChange={(e) => handleLineChange(idx, "description", e.target.value)} wrapperClassName="md:col-span-2" />
              <Input label="Aantal" type="number" min={0} value={line.quantity} onChange={(e) => handleLineChange(idx, "quantity", e.target.value)} />
              <Input label="Prijs/stuk" type="number" min={0} step="0.01" value={line.unit_price} onChange={(e) => handleLineChange(idx, "unit_price", e.target.value)} />
              <Input label="BTW %" type="number" min={0} step="0.01" value={form.vat_exempt ? 0 : line.vat_rate} onChange={(e) => handleLineChange(idx, "vat_rate", e.target.value)} disabled={form.vat_exempt} />
              {lines.length > 1 && (
                <button type="button" className="terminal-button is-danger text-xs" onClick={() => removeLine(idx)}>
                  Verwijder
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-gridline/80">Totaal excl. btw: {totalExcl.toFixed(2)} EUR</div>
      </section>

      <div className="flex justify-between items-center">
        {error ? <p className="text-signal-red text-sm">{error}</p> : <span className="terminal-note">Alle verplichte velden invullen.</span>}
        <button type="button" className="terminal-button is-accent" onClick={handleSubmit} disabled={saving}>
          {saving ? "Opslaan?" : "Factuur opslaan"}
        </button>
      </div>
    </main>
  );
}

function Input({ label, wrapperClassName = "", ...props }) {
  return (
    <label className={`flex flex-col gap-2 ${wrapperClassName}`}>
      <span className="terminal-label">{label}</span>
      <input {...props} className="terminal-input" />
    </label>
  );
}
