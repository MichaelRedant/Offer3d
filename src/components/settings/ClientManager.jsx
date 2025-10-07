import { useEffect, useState } from "react";

import TerminalBackButton from "../TerminalBackButton";
import { baseUrl } from "../../lib/constants";

const EMPTY_FORM = {
  id: null,
  naam: "",
  email: "",
  bedrijf: "",
  btw_nummer: "",
  adres: "",
  telefoon: "",
};

export default function ClientManager() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch(`${baseUrl}/get-clients.php`);
        const data = await response.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Fout bij ophalen klanten:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${baseUrl}/save-client.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert("Fout bij opslaan klant.");
        return;
      }

      if (form.id) {
        setClients((prev) =>
          prev.map((client) => (client.id === form.id ? { ...form } : client))
        );
      } else {
        setClients((prev) => [...prev, { ...form, id: result.id }]);
      }

      setForm(EMPTY_FORM);
      setIsEditing(false);
    } catch (error) {
      console.error("Opslagfout:", error);
      alert("Serverfout bij het opslaan van de klant.");
    }
  };

  const handleEdit = (client) => {
    setForm(client);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Weet je zeker dat je deze klant wil verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-client.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setClients((prev) => prev.filter((client) => client.id !== id));
      }
    } catch (error) {
      console.error("Fout bij verwijderen:", error);
    }
  };

  if (loading) {
    return (
      <section className="terminal-card space-y-3">
        <p className="terminal-section-title">Klantenbeheer</p>
        <p className="terminal-note">Klanten aan het laden...</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Klantenbeheer</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">
              Klanten beheren
            </h1>
          </div>
          <TerminalBackButton label="Terug naar instellingen" to="/instellingen" />
        </div>
        <p className="text-sm text-gridline/70">
          Beheer contactgegevens van klanten die aan offertes gekoppeld kunnen worden.
        </p>
      </header>

      <section className="terminal-card space-y-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            {isEditing ? "Klant bijwerken" : "Nieuwe klant toevoegen"}
          </h2>
          <p className="text-sm text-gridline/70">
            Vul de velden in en sla de klant op voor toekomstig gebruik.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Naam *"
              name="naam"
              value={form.naam}
              onChange={handleChange}
              required
            />
            <Input
              label="E-mail *"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Bedrijf"
              name="bedrijf"
              value={form.bedrijf}
              onChange={handleChange}
            />
            <Input
              label="BTW-nummer"
              name="btw_nummer"
              value={form.btw_nummer}
              onChange={handleChange}
            />
            <Input
              label="Adres"
              name="adres"
              value={form.adres}
              onChange={handleChange}
            />
            <Input
              label="Telefoon"
              name="telefoon"
              value={form.telefoon}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-end gap-3">
            {isEditing && (
              <button
                type="button"
                className="terminal-button is-ghost"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setIsEditing(false);
                }}
              >
                Annuleren
              </button>
            )}
            <button type="submit" className="terminal-button is-accent">
              {isEditing ? "Klant bijwerken" : "Klant toevoegen"}
            </button>
          </div>
        </form>
      </section>

      <section className="terminal-card space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Overzicht klanten
          </h2>
          <p className="text-sm text-gridline/70">
            {clients.length} klant{clients.length === 1 ? "" : "en"} beschikbaar.
          </p>
        </header>

        {clients.length === 0 ? (
          <p className="terminal-note">Geen klanten gevonden.</p>
        ) : (
          <ul className="terminal-list">
            {clients.map((client) => (
              <li
                key={client.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold tracking-[0.08em] uppercase">
                    {client.naam}
                    {client.bedrijf ? ` / ${client.bedrijf}` : ""}
                  </p>
                  <p className="text-xs text-gridline/70 uppercase tracking-[0.12em]">
                    {client.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(client)}
                    className="terminal-button is-ghost text-xs tracking-[0.12em]"
                  >
                    Wijzig
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client.id)}
                    className="terminal-button is-danger text-xs tracking-[0.12em]"
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

function Input({ label, name, value, onChange, type = "text", required }) {
  return (
    <div className="space-y-2">
      <label className="terminal-label" htmlFor={name}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        required={required}
        className="terminal-input"
      />
    </div>
  );
}
