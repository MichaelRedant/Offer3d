import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { baseUrl } from "../../lib/constants";

const EMPTY_FORM = {
  merk: "",
  kostprijs: "",
  verbruik_watt: "",
};

export default function DryerManager() {
  const [dryers, setDryers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDryers();
  }, []);

  async function fetchDryers() {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/get-dryers.php`);
      const data = await response.json();
      setDryers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij ophalen droogkasten:", error);
      showToast({
        type: "error",
        message: "Drogers konden niet geladen worden.",
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
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const startEdit = (dryer) => {
    setEditId(dryer.id);
    setForm({
      merk: dryer.merk ?? "",
      kostprijs: dryer.kostprijs ?? "",
      verbruik_watt: dryer.verbruik_watt ?? "",
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
      const response = await fetch(`${baseUrl}/save-dryer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Opslaan mislukt");
      }

      await fetchDryers();
      resetForm();
      showToast({
        type: "success",
        message: editId ? "Droger bijgewerkt." : "Droger toegevoegd.",
      });
    } catch (error) {
      console.error("Fout bij opslaan droger:", error);
      showToast({
        type: "error",
        message: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Ben je zeker dat je deze droger wilt verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-dryer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await fetchDryers();
      if (editId === id) {
        resetForm();
      }
      showToast({
        type: "success",
        message: "Droger verwijderd.",
      });
    } catch (error) {
      console.error("Fout bij verwijderen droger:", error);
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
            Filamentdrogers
          </h2>
          <p className="text-sm text-gridline/70">
            Beheer investeringen in drogers en houd het stroomverbruik bij.
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
        <div className="terminal-grid md:grid-cols-3">
          <Field
            label="Merk"
            name="merk"
            value={form.merk}
            onChange={handleChange}
            placeholder="Bijvoorbeeld Eibos"
            required
          />
          <Field
            label="Kostprijs (EUR)"
            name="kostprijs"
            type="number"
            min="0"
            step="0.01"
            value={form.kostprijs}
            onChange={handleChange}
          />
          <Field
            label="Verbruik (Watt)"
            name="verbruik_watt"
            type="number"
            min="0"
            value={form.verbruik_watt}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="terminal-button is-accent" disabled={saving}>
            {saving ? "Opslaan..." : editId ? "Droger bijwerken" : "Droger toevoegen"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="terminal-note">Drogers laden...</p>
      ) : dryers.length === 0 ? (
        <p className="terminal-note">Nog geen drogers geregistreerd.</p>
      ) : (
        <ul className="terminal-list">
          {dryers.map((dryer) => (
            <li
              key={dryer.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-[0.08em]">{dryer.merk}</p>
                <p className="text-xs text-gridline/70 uppercase tracking-[0.12em]">
                  {Number.parseFloat(dryer.kostprijs ?? 0).toFixed(2)} EUR • {dryer.verbruik_watt ?? 0} W
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="terminal-button is-ghost text-xs tracking-[0.12em]"
                  onClick={() => startEdit(dryer)}
                >
                  Wijzig
                </button>
                <button
                  type="button"
                  className="terminal-button is-danger text-xs tracking-[0.12em]"
                  onClick={() => handleDelete(dryer.id)}
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
