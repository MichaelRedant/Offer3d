import { useEffect, useState } from "react";
import useQuoteForm from "../hooks/useQuoteForm";

export default function ClientSection() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const { updateClient } = useQuoteForm();

  useEffect(() => {
    fetch("/offr3d/api/get-clients.php")
      .then((response) => response.json())
      .then((data) => setClients(data))
      .catch(() => setClients([]));
  }, []);

  const handleSelectClient = (id) => {
    setSelectedClientId(id);
    const selected = clients.find((client) => client.id === Number(id));
    if (selected) {
      updateClient(selected);
    }
  };

  return (
    <section className="terminal-card space-y-5">
      <header className="space-y-2">
        <p className="terminal-section-title">Stap 01</p>
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Klantgegevens
        </h2>
        <p className="text-sm text-gridline/70">
          Selecteer een bestaande klant of voeg een nieuw contact toe.
        </p>
      </header>

      <div className="space-y-2">
        <label className="terminal-label" htmlFor="existingClient">
          Bestaande klant
        </label>
        <select
          id="existingClient"
          className="terminal-input"
          value={selectedClientId || ""}
          onChange={(event) => handleSelectClient(event.target.value)}
        >
          <option value="">-- Selecteer een klant --</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.naam}
              {client.bedrijf ? ` / ${client.bedrijf}` : ""}
            </option>
          ))}
        </select>
      </div>

      <p className="terminal-note">Nieuwe klant toevoegen</p>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Naam *" className="terminal-input" required />
        <input type="email" placeholder="E-mailadres" className="terminal-input" />
        <input type="text" placeholder="Bedrijf (optioneel)" className="terminal-input" />
        <input type="text" placeholder="BTW-nummer" className="terminal-input" />
        <input type="text" placeholder="Telefoonnummer" className="terminal-input" />
        <input
          type="text"
          placeholder="Adres"
          className="terminal-input md:col-span-2"
        />
        <button
          type="submit"
          className="terminal-button is-accent md:col-span-2"
        >
          Klant toevoegen
        </button>
      </form>
    </section>
  );
}
