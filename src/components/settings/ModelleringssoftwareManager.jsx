import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { baseUrl } from "../../lib/constants";

const EMPTY_FORM = {
  naam: "",
  kostprijs_per_jaar: "",
  gebruikersaantal: "",
  opmerking: "",
};

export default function ModelleringssoftwareManager() {
  const [softwareList, setSoftwareList] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSoftware();
  }, []);

  async function fetchSoftware() {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/get-modelleringssoftware.php`);
      const data = await response.json();
      setSoftwareList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij het ophalen van software:", error);
      showToast({
        type: "error",
        message: "Software kon niet geladen worden.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (software) => {
    setEditId(software.id);
    setForm({
      naam: software.naam ?? "",
      kostprijs_per_jaar: software.kostprijs_per_jaar ?? "",
      gebruikersaantal: software.gebruikersaantal ?? "",
      opmerking: software.opmerking ?? "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = { ...form };
    if (editId) {
      payload.id = editId;
    }

    try {
      const response = await fetch(`${baseUrl}/save-modelleringssoftware.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Opslaan mislukt");
      }

      await fetchSoftware();
      resetForm();
      showToast({
        type: "success",
        message: editId ? "Software bijgewerkt." : "Software toegevoegd.",
      });
    } catch (error) {
      console.error("Fout bij opslaan software:", error);
      showToast({
        type: "error",
        message: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Weet je zeker dat je deze software wilt verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-modelleringssoftware.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await fetchSoftware();
      if (editId === id) {
        resetForm();
      }
      showToast({
        type: "success",
        message: "Software verwijderd.",
      });
    } catch (error) {
      console.error("Fout bij verwijderen software:", error);
      showToast({
        type: "error",
        message: error.message,
      });
    }
  };

  return (
    <section className="terminal-card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Modelleringssoftware
          </h2>
          <p className="text-sm text-gridline/70">
            Houd licenties, kosten en het aantal gebruikers bij.
          </p>
        </div>
        {editId && (
          <button
            type="button"
            className="terminal-button is-ghost text-xs tracking-[0.12em]"
            onClick={resetForm}
          >
            Annuleren
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="terminal-grid md:grid-cols-2">
          <Field
            label="Naam"
            name="naam"
            value={form.naam}
            onChange={handleChange}
            placeholder="Bijvoorbeeld Fusion 360"
            required
          />
          <Field
            label="Kostprijs per jaar (EUR)"
            name="kostprijs_per_jaar"
            type="number"
            min="0"
            step="0.01"
            value={form.kostprijs_per_jaar}
            onChange={handleChange}
          />
          <Field
            label="Gebruikersaantal"
            name="gebruikersaantal"
            type="number"
            min="0"
            value={form.gebruikersaantal}
            onChange={handleChange}
          />
          <Field
            label="Opmerking"
            name="opmerking"
            value={form.opmerking}
            onChange={handleChange}
            placeholder="Bijvoorbeeld licentie type, vervaldatum..."
            className="md:col-span-2"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="terminal-button is-accent" disabled={saving}>
            {saving ? "Opslaan..." : editId ? "Software bijwerken" : "Software toevoegen"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="terminal-note">Software laden...</p>
      ) : softwareList.length === 0 ? (
        <p className="terminal-note">Nog geen software geregistreerd.</p>
      ) : (
        <ul className="terminal-list">
          {softwareList.map((software) => (
            <li
              key={software.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-[0.08em]">{software.naam}</p>
                <p className="text-xs text-gridline/70 uppercase tracking-[0.12em]">
                  {Number.parseFloat(software.kostprijs_per_jaar ?? 0).toFixed(2)} EUR per jaar •{" "}
                  {software.gebruikersaantal ?? 0} gebruiker(s)
                </p>
                {software.opmerking && (
                  <p className="text-xs text-gridline/70">{software.opmerking}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="terminal-button is-ghost text-xs tracking-[0.12em]"
                  onClick={() => startEdit(software)}
                >
                  Wijzig
                </button>
                <button
                  type="button"
                  className="terminal-button is-danger text-xs tracking-[0.12em]"
                  onClick={() => handleDelete(software.id)}
                >
                  Verwijder
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
