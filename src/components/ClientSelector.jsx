import { useEffect, useState } from "react";

export default function ClientSelector({ selectedClient, setSelectedClient }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch("/api/get-clients.php");
        if (!response.ok) {
          throw new Error("Fout bij ophalen klanten");
        }

        const data = await response.json();
        setClients(data);

        if (selectedClient && !data.some((client) => Number(client.id) === Number(selectedClient.id))) {
          const fallback = data.find((client) => Number(client.id) === Number(selectedClient.id));
          if (fallback) {
            setSelectedClient(fallback);
          }
        }
      } catch (error) {
        console.error("Fout bij ophalen klanten:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [selectedClient, setSelectedClient]);

  const handleChange = (event) => {
    const selectedId = Number(event.target.value);
    const client = clients.find((entry) => Number(entry.id) === selectedId);

    if (client) {
      setSelectedClient(client);
    } else {
      setSelectedClient(null);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="clientSelect" className="terminal-label">
        Kies een klant
      </label>

      {loading ? (
        <p className="terminal-note">Klanten aan het laden...</p>
      ) : (
        <select
          id="clientSelect"
          value={selectedClient?.id || ""}
          onChange={handleChange}
          className="terminal-input text-sm tracking-[0.08em]"
        >
          <option value="">-- Selecteer een klant --</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.naam}
              {client.bedrijf ? ` (${client.bedrijf})` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
