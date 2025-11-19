import { useEffect, useMemo, useState } from "react";

import TerminalBackButton from "../TerminalBackButton";
import { baseUrl } from "../../lib/constants";

const EMPTY_FORM = {
  id: null,
  naam: "",
  type: "",
  kleur: "",
  prijs_per_kg: "",
  moet_drogen: false,
  supportmateriaal: false,
  manufacturer_id: "",
  stock_rollen: 0,
  winstmarge_perc: 0,
};

const EMPTY_MANUFACTURER = {
  naam: "",
  land: "",
  website: "",
};

export default function MaterialManager() {
  const [materials, setMaterials] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [manufacturerForm, setManufacturerForm] = useState(EMPTY_MANUFACTURER);
  const [savingManufacturer, setSavingManufacturer] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const filteredMaterials = useMemo(() => {
    if (!filterManufacturer) {
      return materials;
    }

    return materials.filter(
      (material) => String(material.manufacturer_id) === String(filterManufacturer),
    );
  }, [materials, filterManufacturer]);

  const materialStats = useMemo(() => {
    const total = materials.length;
    const drying = materials.filter((material) => material.moet_drogen).length;
    const lowStock = materials.filter(
      (material) => Number(material.stock_rollen ?? 0) <= 1
    ).length;
    const avgMargin =
      total === 0
        ? 0
        : materials.reduce(
            (sum, material) => sum + Number(material.winstmarge_perc ?? 0),
            0
          ) / total;

    return [
      {
        label: "Totaal materialen",
        value: total,
        description: "Beschikbaar in de bibliotheek",
      },
      {
        label: "Droging vereist",
        value: drying,
        description: "Materiaaltypes met droogvereiste",
      },
      {
        label: "Lage voorraad",
        value: lowStock,
        description: "Rollen met voorraad ≤ 1",
      },
      {
        label: "Gem. winstmarge",
        value: `${avgMargin.toFixed(1)}%`,
        description: "Op materiaalspecificaties",
      },
    ];
  }, [materials]);

  function showFeedback(type, message) {
    setFeedback({ type, message, id: Date.now() });
  }

  async function fetchMaterials() {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/get-materials.php`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Fout bij ophalen materialen");
      }
      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij laden materialen:", error);
      showFeedback("error", "Materialen konden niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchManufacturers() {
    try {
      const response = await fetch(`${baseUrl}/get-manufacturers.php`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Fout bij ophalen fabrikanten");
      }
      const data = await response.json();
      setManufacturers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij ophalen fabrikanten:", error);
      showFeedback("error", "Fabrikanten konden niet geladen worden.");
    }
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    showFeedback("info", "Formulier teruggezet naar een nieuw materiaal.");
  };

  const handleEdit = (material) => {
    setForm({
      id: material.id,
      naam: material.naam ?? "",
      type: material.type ?? "",
      kleur: material.kleur ?? "",
      prijs_per_kg: material.prijs_per_kg ?? "",
      moet_drogen: Boolean(material.moet_drogen),
      supportmateriaal: Boolean(material.supportmateriaal),
      manufacturer_id: material.manufacturer_id ?? "",
      stock_rollen: material.stock_rollen ?? 0,
      winstmarge_perc: material.winstmarge_perc ?? 0,
    });
    setIsEditing(true);
    showFeedback("info", `Materiaal "${material.naam}" klaar om te bewerken.`);
  };

  const handleDelete = async (id) => {
    if (!confirm("Weet je zeker dat je dit materiaal wilt verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-material.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMaterials((prev) => prev.filter((material) => material.id !== id));
        showFeedback("info", "Materiaal verwijderd.");
      } else {
        throw new Error(result.error || "Verwijderen mislukt.");
      }
    } catch (error) {
      console.error("Fout bij verwijderen materiaal:", error);
      showFeedback("error", error.message || "Verwijderen mislukt.");
    }
  };

  async function handleSave(event) {
    event.preventDefault();

    const endpoint = form.id ? "update-material.php" : "save-material.php";

    try {
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (form.id) {
          setMaterials((prev) =>
            prev.map((material) => (material.id === form.id ? { ...material, ...form } : material))
          );
          showFeedback("success", `Materiaal "${form.naam}" bijgewerkt.`);
        } else if (result.material) {
          setMaterials((prev) => [...prev, result.material]);
          showFeedback("success", `Materiaal "${result.material.naam}" toegevoegd.`);
        } else {
          await fetchMaterials();
          showFeedback("success", "Materiaal opgeslagen.");
        }

        handleReset();
      } else {
        throw new Error(result.error || "Opslaan mislukt.");
      }
    } catch (error) {
      console.error("Fout bij opslaan:", error);
      showFeedback("error", error.message || "Opslaan mislukt.");
    }
  }

  const handleManufacturerChange = (event) => {
    const { name, value } = event.target;
    setManufacturerForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleCreateManufacturer(event) {
    event.preventDefault();
    setSavingManufacturer(true);

    try {
      const response = await fetch(`${baseUrl}/add-manufacturer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manufacturerForm),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Opslaan mislukt.");
      }

      setManufacturers((prev) => [...prev, result.manufacturer]);
      setForm((prev) => ({
        ...prev,
        manufacturer_id: result.manufacturer?.id ?? prev.manufacturer_id,
      }));
      setShowManufacturerModal(false);
      setManufacturerForm(EMPTY_MANUFACTURER);
      showFeedback("success", "Nieuwe fabrikant toegevoegd.");
    } catch (error) {
      console.error(error);
      showFeedback("error", error.message || "Aanmaken van fabrikant mislukt.");
    } finally {
      setSavingManufacturer(false);
    }
  }

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Materiaalbeheer</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">
              Filament & materialen
            </h1>
          </div>
          <TerminalBackButton label="Terug naar dashboard" to="/" />
        </div>
        <p className="text-sm text-gridline/70">
          Houd de volledige materialenbibliotheek bij, beheer fabricanten en bewaak marges en
          voorraad.
        </p>
      </header>

      {feedback && (
        <FeedbackBanner
          key={feedback.id}
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {materialStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-gridline/60 bg-parchment-light/80 p-4 shadow-terminal-inset space-y-1"
          >
            <p className="terminal-label">{stat.label}</p>
            <p className="text-xl font-semibold tracking-[0.16em] text-base-soft">{stat.value}</p>
            <p className="text-xs text-gridline/70 tracking-[0.08em]">{stat.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,420px),1fr]">
        <form onSubmit={handleSave} className="terminal-card space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="terminal-section-title">Materiaalformulier</p>
              <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
                {isEditing ? "Materiaal bewerken" : "Nieuw materiaal toevoegen"}
              </h2>
            </div>
            {isEditing && (
              <span className="terminal-pill text-xs tracking-[0.12em] text-signal-amber">
                Bewerking actief
              </span>
            )}
          </header>

          <div className="space-y-3">
            <InputField label="Naam" name="naam" value={form.naam} onChange={handleChange} required />
            <InputField
              label="Type filament"
              name="type"
              value={form.type}
              onChange={handleChange}
              placeholder="PLA, PETG, TPU…"
            />
            <InputField
              label="Kleur"
              name="kleur"
              value={form.kleur}
              onChange={handleChange}
              placeholder="Bijv. Zwart, Goud"
            />
            <InputField
              label="Prijs per kilogram"
              name="prijs_per_kg"
              type="number"
              step="0.01"
              min="0"
              value={form.prijs_per_kg}
              onChange={handleChange}
              suffix="EUR"
              required
            />

            <div className="space-y-2">
              <label className="terminal-label" htmlFor="manufacturer_id">
                Fabrikant
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="manufacturer_id"
                  name="manufacturer_id"
                  value={form.manufacturer_id || ""}
                  onChange={handleChange}
                  className="terminal-input"
                >
                  <option value="">-- Selecteer fabrikant --</option>
                  {manufacturers.map((manufacturer) => (
                    <option key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.naam}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="terminal-button is-ghost text-xs tracking-[0.12em]"
                  onClick={() => setShowManufacturerModal(true)}
                >
                  Nieuw
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Voorraad (rollen)"
                name="stock_rollen"
                type="number"
                min="0"
                value={form.stock_rollen}
                onChange={handleChange}
              />
              <InputField
                label="Materiaalwinstmarge"
                name="winstmarge_perc"
                type="number"
                min="0"
                value={form.winstmarge_perc}
                onChange={handleChange}
                suffix="%"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gridline/80">
              <label className="inline-flex items-center gap-2 tracking-[0.08em] uppercase">
                <input
                  type="checkbox"
                  name="moet_drogen"
                  checked={form.moet_drogen}
                  onChange={handleChange}
                />
                Droging vereist
              </label>
              <label className="inline-flex items-center gap-2 tracking-[0.08em] uppercase">
                <input
                  type="checkbox"
                  name="supportmateriaal"
                  checked={form.supportmateriaal}
                  onChange={handleChange}
                />
                Supportmateriaal
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            {isEditing && (
              <button type="button" className="terminal-button is-ghost" onClick={handleReset}>
                Annuleren
              </button>
            )}
            <button type="submit" className="terminal-button is-accent">
              {isEditing ? "Materiaal bijwerken" : "Materiaal toevoegen"}
            </button>
          </div>
        </form>

        <section className="space-y-5">
          <div className="terminal-card space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="terminal-section-title">Materialenbibliotheek</p>
                <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
                  Overzicht materialen
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterManufacturer}
                  onChange={(event) => setFilterManufacturer(event.target.value)}
                  className="terminal-input"
                >
                  <option value="">Alle fabrikanten</option>
                  {manufacturers.map((manufacturer) => (
                    <option key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.naam}
                    </option>
                  ))}
                </select>
                {filterManufacturer && (
                  <button
                    type="button"
                    className="terminal-button is-ghost text-xs tracking-[0.12em]"
                    onClick={() => setFilterManufacturer("")}
                  >
                    Reset
                  </button>
                )}
              </div>
            </header>

            {loading ? (
              <p className="terminal-note">Materialen laden…</p>
            ) : filteredMaterials.length === 0 ? (
              <p className="terminal-note">Geen materialen gevonden.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredMaterials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </section>

      {showManufacturerModal && (
        <div className="terminal-modal">
          <div className="terminal-modal__panel space-y-4">
            <header className="space-y-2">
              <p className="terminal-section-title">Nieuwe fabrikant</p>
              <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
                Fabrikant toevoegen
              </h2>
            </header>

            <form onSubmit={handleCreateManufacturer} className="space-y-4">
              <InputField
                label="Naam"
                name="naam"
                value={manufacturerForm.naam}
                onChange={handleManufacturerChange}
                required
              />
              <InputField
                label="Land"
                name="land"
                value={manufacturerForm.land}
                onChange={handleManufacturerChange}
              />
              <InputField
                label="Website"
                name="website"
                value={manufacturerForm.website}
                onChange={handleManufacturerChange}
                placeholder="https://"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="terminal-button is-ghost"
                  onClick={() => setShowManufacturerModal(false)}
                  disabled={savingManufacturer}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="terminal-button is-accent"
                  disabled={savingManufacturer}
                >
                  {savingManufacturer ? "Opslaan…" : "Opslaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function InputField({ label, name, onChange, suffix, className = "", ...inputProps }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="terminal-label flex items-center justify-between gap-3" htmlFor={name}>
        <span>{label}</span>
        {suffix && (
          <span className="terminal-note text-[0.6rem] tracking-[0.14em] text-gridline/70">
            {suffix}
          </span>
        )}
      </label>
      <input
        {...inputProps}
        name={name}
        id={name}
        className="terminal-input"
        onChange={onChange}
      />
    </div>
  );
}

function MaterialCard({ material, onEdit, onDelete }) {
  return (
    <article className="rounded-card border border-gridline/50 bg-parchment/80 p-4 shadow-terminal-inset space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[0.1em] uppercase text-base-soft">
            {material.naam}
          </h3>
          <p className="text-xs tracking-[0.08em] text-gridline/70">
            {[material.type, material.kleur].filter(Boolean).join(" • ") || "Onbekende specificaties"}
          </p>
        </div>
        {material.manufacturer && (
          <span className="terminal-pill text-xs tracking-[0.12em]">
            {material.manufacturer}
          </span>
        )}
      </header>

      <dl className="text-xs tracking-[0.08em] text-gridline/80 space-y-1">
        <div className="flex justify-between gap-3">
          <dt>Prijs / kg</dt>
          <dd>{Number.parseFloat(material.prijs_per_kg ?? 0).toFixed(2)} EUR</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Winstmarge</dt>
          <dd>{Number.parseFloat(material.winstmarge_perc ?? 0).toFixed(1)}%</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Stock</dt>
          <dd>{material.stock_rollen ?? 0} rollen</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-gridline/70">
        {material.moet_drogen && <span className="terminal-pill">Droging nodig</span>}
        {material.supportmateriaal && <span className="terminal-pill">Supportmateriaal</span>}
      </div>

      <footer className="flex flex-wrap gap-2">
        <button
          type="button"
          className="terminal-button is-ghost text-xs tracking-[0.12em]"
          onClick={() => onEdit(material)}
        >
          Wijzig
        </button>
        <button
          type="button"
          className="terminal-button is-danger text-xs tracking-[0.12em]"
          onClick={() => onDelete(material.id)}
        >
          Verwijder
        </button>
      </footer>
    </article>
  );
}

function FeedbackBanner({ type = "info", message, onDismiss }) {
  const tones = {
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

  const tone = tones[type] ?? tones.info;

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
