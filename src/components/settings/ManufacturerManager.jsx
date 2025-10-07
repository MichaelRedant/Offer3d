import { useEffect, useState } from "react";

import TerminalBackButton from "../TerminalBackButton";
import { baseUrl } from "../../lib/constants";

const EMPTY_FORM = {
  id: null,
  naam: "",
  land: "",
  website: "",
};

export default function ManufacturerManager() {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  async function fetchManufacturers() {
    try {
      const response = await fetch(`${baseUrl}/get-manufacturers.php`);
      const data = await response.json();
      setManufacturers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij ophalen fabrikanten:", error);
      alert("Fabrikanten konden niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
  };

  const handleEdit = (manufacturer) => {
    setForm({
      id: manufacturer.id,
      naam: manufacturer.naam ?? "",
      land: manufacturer.land ?? "",
      website: manufacturer.website ?? "",
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Weet je zeker dat je deze fabrikant wilt verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-manufacturer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setManufacturers((prev) => prev.filter((manufacturer) => manufacturer.id !== id));
      } else {
        alert("Verwijderen mislukt.");
      }
    } catch (error) {
      console.error("Fout bij verwijderen fabrikant:", error);
      alert("Er ging iets mis bij het verwijderen.");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const endpoint = form.id ? "update-manufacturer.php" : "add-manufacturer.php";

    try {
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Opslaan mislukt");
      }

      if (form.id) {
        setManufacturers((prev) =>
          prev.map((manufacturer) => (manufacturer.id === form.id ? { ...form } : manufacturer)),
        );
      } else if (result.manufacturer) {
        setManufacturers((prev) => [...prev, result.manufacturer]);
      } else {
        fetchManufacturers();
      }

      handleReset();
    } catch (error) {
      console.error("Fout bij opslaan fabrikant:", error);
      alert(error.message);
    }
  };

  return (
    <section className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Fabrikantenbeheer</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">
              Fabrikanten beheren
            </h1>
          </div>
          <TerminalBackButton label="Terug naar instellingen" to="/instellingen" />
        </div>
        <p className="text-sm text-gridline/70">
          Houd leveranciersinformatie bij en verbind materialen met hun fabrikant.
        </p>
      </header>

      <form onSubmit={handleSave} className="terminal-card space-y-6">
        <div className="terminal-grid md:grid-cols-2">
          <Field
            label="Naam"
            name="naam"
            value={form.naam}
            onChange={handleChange}
            required
            placeholder="Bijvoorbeeld ColorFabb"
          />
          <Field
            label="Land"
            name="land"
            value={form.land}
            onChange={handleChange}
            placeholder="Bijvoorbeeld Nederland"
          />
          <Field
            label="Website"
            name="website"
            value={form.website}
            onChange={handleChange}
            placeholder="https://voorbeeld.com"
            className="md:col-span-2"
          />
        </div>

        <div className="flex justify-end gap-3">
          {isEditing && (
            <button type="button" className="terminal-button is-ghost" onClick={handleReset}>
              Annuleren
            </button>
          )}
          <button type="submit" className="terminal-button is-accent">
            {isEditing ? "Fabrikant bijwerken" : "Fabrikant toevoegen"}
          </button>
        </div>
      </form>

      <section className="terminal-card space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Overzicht fabrikanten
          </h2>
          <p className="text-sm text-gridline/70">
            {manufacturers.length} leverancier(s) beschikbaar.
          </p>
        </header>

        {loading ? (
          <p className="terminal-note">Fabrikanten laden...</p>
        ) : manufacturers.length === 0 ? (
          <p className="terminal-note">Nog geen fabrikanten toegevoegd.</p>
        ) : (
          <ul className="terminal-list">
            {manufacturers.map((manufacturer) => (
              <li
                key={manufacturer.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold uppercase tracking-[0.08em]">
                    {manufacturer.naam}
                  </p>
                  <p className="text-xs text-gridline/70 uppercase tracking-[0.12em]">
                    {manufacturer.land || "Land onbekend"}
                    {manufacturer.website ? ` • ${manufacturer.website}` : ""}
                  </p>
                  <p className="text-xs text-gridline/70">
                    Gekoppelde materialen: {manufacturer.materiaal_count ?? 0}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="terminal-button is-ghost text-xs tracking-[0.12em]"
                    onClick={() => handleEdit(manufacturer)}
                  >
                    Wijzig
                  </button>
                  <button
                    type="button"
                    className="terminal-button is-danger text-xs tracking-[0.12em]"
                    onClick={() => handleDelete(manufacturer.id)}
                  >
                    Verwijder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function Field({ label, name, onChange, className = "", ...inputProps }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="terminal-label" htmlFor={name}>
        {label}
      </label>
      <input
        {...inputProps}
        id={name}
        name={name}
        className="terminal-input"
        onChange={onChange}
      />
    </div>
  );
}
