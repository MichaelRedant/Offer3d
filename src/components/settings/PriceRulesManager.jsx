import { useEffect, useMemo, useState } from "react";
import { baseUrl } from "../../lib/constants";
import TerminalBackButton from "../TerminalBackButton";

const EMPTY_RULE = {
  id: null,
  client_id: "",
  segment: "",
  material_id: "",
  min_qty: "",
  price_per_unit: "",
  margin_override: "",
  valid_from: "",
  valid_to: "",
  active: 1,
};

export default function PriceRulesManager() {
  const [rules, setRules] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY_RULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [rulesRes, matRes, clientRes] = await Promise.all([
        fetch(`${baseUrl}/get-price-rules.php`).then((r) => r.json()),
        fetch(`${baseUrl}/get-materials.php`).then((r) => r.json()),
        fetch(`${baseUrl}/get-clients.php`).then((r) => r.json()),
      ]);
      setRules(Array.isArray(rulesRes) ? rulesRes : []);
      setMaterials(Array.isArray(matRes) ? matRes : []);
      setClients(Array.isArray(clientRes) ? clientRes : []);
    } catch (error) {
      console.error("Fout bij laden prijslijsten:", error);
      setStatus({ type: "error", message: "Kon prijslijsten of data niet laden." });
    } finally {
      setLoading(false);
    }
  }

  const materialOptions = useMemo(
    () =>
      materials.map((mat) => ({
        value: mat.id,
        label: `${mat.naam}${mat.kleur ? ` (${mat.kleur})` : ""}`,
      })),
    [materials]
  );

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: `${client.naam}${client.bedrijf ? ` (${client.bedrijf})` : ""}`,
      })),
    [clients]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  const handleEdit = (rule) => {
    setForm({
      id: rule.id,
      client_id: rule.client_id ?? "",
      segment: rule.segment ?? "",
      material_id: rule.material_id ?? "",
      min_qty: rule.min_qty ?? "",
      price_per_unit: rule.price_per_unit ?? "",
      margin_override: rule.margin_override ?? "",
      valid_from: rule.valid_from ?? "",
      valid_to: rule.valid_to ?? "",
      active: Number(rule.active ?? 1),
    });
    setStatus(null);
  };

  const handleReset = () => {
    setForm(EMPTY_RULE);
    setStatus(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.material_id || (!form.price_per_unit && !form.margin_override)) {
      setStatus({
        type: "error",
        message: "Materiaal is verplicht en vul minstens prijs/kg of marge in.",
      });
      return;
    }
    setSaving(true);
    setStatus(null);
    const endpoint = form.id ? "update-price-rule.php" : "save-price-rule.php";
    try {
      const payload = {
        ...form,
        material_id: form.material_id ? Number(form.material_id) : null,
        client_id: form.client_id ? Number(form.client_id) : null,
        min_qty: form.min_qty === "" ? null : Number(form.min_qty),
        price_per_unit: form.price_per_unit === "" ? null : Number(form.price_per_unit),
        margin_override: form.margin_override === "" ? null : Number(form.margin_override),
        active: Number(form.active ?? 1),
      };
      const res = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Opslaan mislukt");
      }
      setStatus({ type: "success", message: "Regel opgeslagen." });
      handleReset();
      loadAll();
    } catch (error) {
      console.error("Fout bij opslaan regel:", error);
      setStatus({ type: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Weet je zeker dat je deze regel wilt verwijderen?")) return;
    try {
      const res = await fetch(`${baseUrl}/delete-price-rule.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Verwijderen mislukt");
      }
      setRules((prev) => prev.filter((r) => r.id !== id));
      setStatus({ type: "success", message: "Regel verwijderd." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Prijslijsten</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">Prijsregels</h1>
          </div>
          <TerminalBackButton label="Terug naar instellingen" to="/instellingen" />
        </div>
        <p className="text-sm text-gridline/70">
          Stel prijs- en marge-overrides per materiaal (optioneel per klant) in. Regels met een
          minimumgewicht gelden pas vanaf die drempel. Geldigheid en actief-status bepalen of een
          regel meetelt.
        </p>
      </header>

      {status && (
        <div
          className={`rounded-card border p-4 text-sm ${
            status.type === "success"
              ? "border-signal-green/60 bg-signal-green/10 text-signal-green"
              : "border-signal-red/60 bg-signal-red/10 text-signal-red"
          }`}
        >
          {status.message}
        </div>
      )}

      <section className="terminal-card space-y-4">
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          {form.id ? "Regel bewerken" : "Nieuwe prijsregel"}
        </h2>
        <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
          <Field label="Materiaal" required>
            <select
              name="material_id"
              value={form.material_id}
              onChange={handleChange}
              className="terminal-input"
              required
            >
              <option value="">Kies materiaal</option>
              {materialOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Klant (optioneel)">
            <select
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              className="terminal-input"
            >
              <option value="">Alle klanten</option>
              {clientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Segment (optioneel)">
            <input
              name="segment"
              value={form.segment}
              onChange={handleChange}
              className="terminal-input"
              placeholder="Bijv. B2B, onderwijs"
            />
          </Field>
          <Field label="Minimum gewicht (kg)">
            <input
              type="number"
              name="min_qty"
              value={form.min_qty}
              onChange={handleChange}
              className="terminal-input"
              min="0"
              step="0.01"
            />
          </Field>
          <Field label="Prijs per kg (override)">
            <input
              type="number"
              name="price_per_unit"
              value={form.price_per_unit}
              onChange={handleChange}
              className="terminal-input"
              min="0"
              step="0.01"
              placeholder="Laat leeg om alleen marge te override'en"
            />
          </Field>
          <Field label="Marge override (%)">
            <input
              type="number"
              name="margin_override"
              value={form.margin_override}
              onChange={handleChange}
              className="terminal-input"
              min="0"
              step="0.1"
              placeholder="Laat leeg om prijs te gebruiken"
            />
          </Field>
          <Field label="Geldig van">
            <input
              type="date"
              name="valid_from"
              value={form.valid_from}
              onChange={handleChange}
              className="terminal-input"
            />
          </Field>
          <Field label="Geldig tot">
            <input
              type="date"
              name="valid_to"
              value={form.valid_to}
              onChange={handleChange}
              className="terminal-input"
            />
          </Field>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              name="active"
              checked={Boolean(form.active)}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="text-sm text-base-soft">
              Actief
            </label>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2 justify-end">
            {form.id && (
              <button type="button" className="terminal-button is-ghost" onClick={handleReset}>
                Annuleren
              </button>
            )}
            <button type="submit" className="terminal-button is-accent" disabled={saving}>
              {saving ? "Opslaan..." : form.id ? "Regel bijwerken" : "Regel opslaan"}
            </button>
          </div>
        </form>
        <p className="terminal-note">
          Regels worden gekozen op specificiteit: klant+materiaal &gt; materiaal &gt; algemeen. De
          hoogste minimum-kg drempel die past wordt gekozen.
        </p>
      </section>

      <section className="terminal-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Bestaande regels
          </h2>
          <span className="terminal-note">{rules.length} regels</span>
        </div>
        {loading ? (
          <p className="terminal-note">Regels laden...</p>
        ) : rules.length === 0 ? (
          <p className="terminal-note">Nog geen regels toegevoegd.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="rounded-card border border-gridline/50 bg-parchment/85 p-4 shadow-terminal space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="terminal-label">Materiaal #{rule.material_id}</p>
                    <p className="text-base font-semibold tracking-[0.08em] text-base-soft">
                      {materialOptions.find((m) => Number(m.value) === Number(rule.material_id))?.label ||
                        "Onbekend"}
                    </p>
                    {rule.client_id ? (
                      <p className="text-xs text-gridline/70">
                        Klant:{" "}
                        {clientOptions.find((c) => Number(c.value) === Number(rule.client_id))?.label ||
                          `#${rule.client_id}`}
                      </p>
                    ) : (
                      <p className="text-xs text-gridline/70">Alle klanten</p>
                    )}
                    {rule.segment && (
                      <p className="text-xs text-gridline/70">Segment: {rule.segment}</p>
                    )}
                  </div>
                  <span
                    className={`terminal-pill text-xs tracking-[0.12em] ${
                      String(rule.active) === "1"
                        ? "text-signal-green border-signal-green/60"
                        : "text-gridline/70 border-gridline/50"
                    }`}
                  >
                    {String(rule.active) === "1" ? "Actief" : "Inactief"}
                  </span>
                </div>
                <div className="text-sm text-gridline/80 space-y-1">
                  {rule.price_per_unit !== null && rule.price_per_unit !== undefined && (
                    <p>
                      Prijs/kg: <span className="text-base-soft">€{Number(rule.price_per_unit).toFixed(2)}</span>
                    </p>
                  )}
                  {rule.margin_override !== null && rule.margin_override !== undefined && (
                    <p>
                      Marge: <span className="text-base-soft">{Number(rule.margin_override).toFixed(1)}%</span>
                    </p>
                  )}
                  {rule.min_qty ? <p>Min. gewicht: {Number(rule.min_qty)} kg</p> : <p>Geen minimum</p>}
                  {(rule.valid_from || rule.valid_to) && (
                    <p className="text-xs text-gridline/70">
                      Geldig {rule.valid_from || "?"} - {rule.valid_to || "?"}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="terminal-button is-ghost text-xs tracking-[0.12em]"
                    onClick={() => handleEdit(rule)}
                  >
                    Bewerken
                  </button>
                  <button
                    type="button"
                    className="terminal-button is-danger text-xs tracking-[0.12em]"
                    onClick={() => handleDelete(rule.id)}
                  >
                    Verwijderen
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="space-y-2 text-sm text-base-soft/90">
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-gridline/80">
        {label}
        {required && <span className="text-signal-red">*</span>}
      </span>
      {children}
    </label>
  );
}
