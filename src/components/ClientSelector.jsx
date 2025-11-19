import { useEffect, useState } from "react";
import { baseUrl } from "../lib/constants";

export default function ClientSelector({
  selectedClient,
  setSelectedClient,
  refreshKey = 0,
  onClientsLoaded,
}) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchClients() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${baseUrl}/get-clients.php`);
        if (!response.ok) {
          throw new Error("Fout bij ophalen klanten");
        }

        const data = await response.json();
        if (ignore) return;

        setClients(data);
        onClientsLoaded?.(data);
      } catch (error) {
        if (!ignore) {
          console.error("Fout bij ophalen klanten:", error);
          setClients([]);
          setError("Klanten konden niet geladen worden.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchClients();
    return () => {
      ignore = true;
    };
  }, [refreshKey, onClientsLoaded]);

  useEffect(() => {
    if (!selectedClient || clients.length === 0) return;

    const canonical = clients.find(
      (client) => Number(client.id) === Number(selectedClient.id)
    );

    if (!canonical) {
      setSelectedClient(null);
    } else if (canonical !== selectedClient) {
      setSelectedClient(canonical);
    }
  }, [clients, selectedClient, setSelectedClient]);

  const handleChange = (event) => {
    const selectedId = Number(event.target.value);
    const client = clients.find((entry) => Number(entry.id) === selectedId);

    if (client) {
      setSelectedClient(client);
    } else {
      setSelectedClient(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasFilter = normalizedSearch.length > 0;
  const filteredClients =
    !hasFilter
      ? clients
      : clients.filter((client) => {
          const haystack = [
            client.naam ?? "",
            client.bedrijf ?? "",
            client.email ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedSearch);
        });
  const noMatches = hasFilter && !loading && filteredClients.length === 0;

  return (
    <div className="space-y-2">
      <label htmlFor="clientSelect" className="terminal-label">
        Kies een klant
      </label>

      {error ? (
        <p className="terminal-note text-signal-red">{error}</p>
      ) : loading ? (
        <p className="terminal-note">Klanten aan het laden...</p>
      ) : clients.length === 0 ? (
        <p className="terminal-note">Nog geen klanten beschikbaar.</p>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="clientSearch" className="terminal-label">
              Zoek op naam, bedrijf of e-mail
            </label>
            <input
              id="clientSearch"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Bijvoorbeeld 'Atelier', 'info@'"
              className="terminal-input text-sm tracking-[0.08em] text-ink placeholder:text-gridline/70"
            />
          </div>

          {noMatches ? (
            <p className="terminal-note">
              Geen klanten gevonden voor &ldquo;{searchTerm.trim()}&rdquo;.
            </p>
          ) : (
            <select
              id="clientSelect"
              value={selectedClient?.id || ""}
              onChange={handleChange}
              className="terminal-input text-sm tracking-[0.08em] text-ink"
              disabled={filteredClients.length === 0}
            >
              <option value="">-- Selecteer een klant --</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.naam}
                  {client.bedrijf ? ` (${client.bedrijf})` : ""}
                </option>
              ))}
            </select>
          )}
        </>
      )}
    </div>
  );
}
