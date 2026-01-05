import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";
import { useToast } from "../context/ToastContext";

const EMPTY_FORM = {
  id: null,
  naam: "",
  email: "",
  bedrijf: "",
  btw_nummer: "",
  adres: "",
  telefoon: "",
  street: "",
  postal_code: "",
  city: "",
  country_code: "BE",
  peppol_endpoint_id: "",
  peppol_scheme: "9956",
};

const STAT_CARDS = [
  { key: "company", label: "Met bedrijfsnaam", accessor: (client) => Boolean(client.bedrijf?.trim()) },
  { key: "vat", label: "Met BTW-nummer", accessor: (client) => Boolean(client.btw_nummer?.trim()) },
  { key: "phone", label: "Met telefoon", accessor: (client) => Boolean(client.telefoon?.trim()) },
];

const FILTERS = [
  { key: "all", label: "Alle klanten", predicate: () => true },
  { key: "withEmail", label: "Met e-mail", predicate: (client) => Boolean(client.email?.trim()) },
  { key: "withBtw", label: "Met BTW-nummer", predicate: (client) => Boolean(client.btw_nummer?.trim()) },
  { key: "withPhone", label: "Met telefoon", predicate: (client) => Boolean(client.telefoon?.trim()) },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Naam (A-Z)" },
  { value: "name-desc", label: "Naam (Z-A)" },
  { value: "recent", label: "Recent toegevoegd" },
];

function normalizeClient(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id ? Number(raw.id) : raw.id,
  };
}

export default function KlantenBeheer() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name-asc");
  const { showToast } = useToast();
  const [viesStatus, setViesStatus] = useState(null);
  const navigate = useNavigate();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/get-clients.php`, { cache: "no-store" });
      const data = await response.json();
      setClients(Array.isArray(data) ? data.map(normalizeClient) : []);
    } catch (error) {
      console.error("Fout bij ophalen klanten:", error);
      showToast({ type: "error", message: "Klanten konden niet worden opgehaald." });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      id: form.id ?? undefined,
      naam: form.naam?.trim() ?? "",
      email: form.email?.trim() ?? "",
      bedrijf: form.bedrijf?.trim() ?? "",
      btw_nummer: form.btw_nummer?.trim() ?? "",
      adres: form.adres?.trim() ?? "",
      telefoon: form.telefoon?.trim() ?? "",
      street: form.street?.trim() ?? "",
      postal_code: form.postal_code?.trim() ?? "",
      city: form.city?.trim() ?? "",
      country_code: form.country_code?.trim() || "BE",
      peppol_endpoint_id: form.peppol_endpoint_id?.trim() ?? "",
      peppol_scheme: form.peppol_scheme?.trim() ?? "9956",
    };

    try {
      const response = await fetch(`${baseUrl}/save-client.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Opslaan mislukt.");
      }

      await fetchClients();
      showToast({
        type: "success",
        message: form.id ? "Klantgegevens bijgewerkt." : "Nieuwe klant opgeslagen.",
      });
      resetForm();
    } catch (error) {
      console.error("Fout bij opslaan klant:", error);
      showToast({
        type: "error",
        message: error?.message || "Serverfout bij het opslaan van de klant.",
      });
    }
  };

  const handleViesLookup = async () => {
    const vat = form.btw_nummer?.trim();
    if (!vat) {
      showToast({ type: "warning", message: "Vul eerst een BTW-nummer in." });
      return;
    }
    setViesStatus({ state: "loading", message: "VIES check..." });
    try {
      const response = await fetch(`${baseUrl}/check-vat.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vat_number: vat, country_code: form.country_code || undefined }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "VIES controle mislukt.");
      }
      const address = result.address || "";
      let street = form.street;
      let postal = form.postal_code;
      let city = form.city;
      if (address) {
        const lines = address.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          street = street || lines[0];
          const last = lines[lines.length - 1];
          const m = last.match(/(\d{3,10})\s+(.*)/);
          if (m) {
            postal = postal || m[1];
            city = city || m[2];
          } else {
            city = city || last;
          }
        }
      }
      setForm((prev) => ({
        ...prev,
        bedrijf: prev.bedrijf || result.name || prev.bedrijf,
        street: street || prev.street,
        postal_code: postal || prev.postal_code,
        city: city || prev.city,
        country_code: result.countryCode || prev.country_code || "BE",
      }));
      setViesStatus({ state: result.valid ? "valid" : "invalid", message: result.valid ? "Geldig volgens VIES." : "Ongeldig volgens VIES." });
      showToast({ type: result.valid ? "success" : "warning", message: viesStatus?.message || "VIES resultaat bijgewerkt." });
    } catch (error) {
      setViesStatus({ state: "error", message: error.message });
      showToast({ type: "error", message: error.message || "VIES check mislukt." });
    }
  };

  const handleEdit = (client) => {
    setForm({ ...EMPTY_FORM, ...client, id: client.id ?? null });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Wil je deze klant verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-client.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      if (result.success) {
        showToast({ type: "success", message: "Klant verwijderd." });
        await fetchClients();
      } else {
        throw new Error(result.error || "Verwijderen mislukt.");
      }
    } catch (error) {
      console.error("Fout bij verwijderen klant:", error);
      showToast({ type: "error", message: error?.message || "Serverfout bij verwijderen." });
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredClients = useMemo(() => {
    const filter = FILTERS.find((entry) => entry.key === activeFilter) ?? FILTERS[0];
    const base = !normalizedSearch
      ? clients
      : clients.filter((client) => {
          const haystack = [client.naam, client.bedrijf, client.email, client.telefoon]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedSearch);
        });
    return base.filter((client) => filter.predicate(client));
  }, [clients, normalizedSearch, activeFilter]);

  const sortedClients = useMemo(() => {
    const copy = [...filteredClients];
    switch (sortKey) {
      case "name-desc":
        return copy.sort((a, b) => (b.naam || "").localeCompare(a.naam || "", "nl"));
      case "recent":
        return copy.sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
      case "name-asc":
      default:
        return copy.sort((a, b) => (a.naam || "").localeCompare(b.naam || "", "nl"));
    }
  }, [filteredClients, sortKey]);

  const statCards = useMemo(() => {
    return STAT_CARDS.map((card) => ({
      key: card.key,
      label: card.label,
      value: clients.filter(card.accessor).length,
    }));
  }, [clients]);

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Klantenbeheer</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">Klanten beheren</h1>
          </div>
          <TerminalBackButton label="Terug naar instellingen" to="/instellingen" />
        </div>
        <p className="text-sm text-gridline/70">
          Voeg nieuwe klanten toe, werk gegevens bij en beheer het klantenbestand.
        </p>
      </header>

      <section className="terminal-card space-y-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            {isEditing ? "Klant bijwerken" : "Nieuwe klant toevoegen"}
          </h2>
          <p className="text-sm text-gridline/70">
            Vul minstens de naam in. Extra velden helpen bij offerteopmaak.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Naam *" name="naam" value={form.naam} onChange={handleChange} required />
            <Input label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} />
            <Input label="Bedrijf" name="bedrijf" value={form.bedrijf} onChange={handleChange} />
            <Input label="BTW-nummer" name="btw_nummer" value={form.btw_nummer} onChange={handleChange} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="terminal-button is-ghost text-xs tracking-[0.12em]" onClick={handleViesLookup}>
                VIES check
              </button>
              {viesStatus && (
                <span
                  className={`terminal-pill text-xs ${
                    viesStatus.state === "valid"
                      ? "text-signal-green border-signal-green/60"
                      : viesStatus.state === "invalid"
                        ? "text-signal-red border-signal-red/60"
                        : viesStatus.state === "error"
                          ? "text-signal-red border-signal-red/60"
                          : "text-gridline/80"
                  }`}
                >
                  {viesStatus.message}
                </span>
              )}
            </div>
            <Input label="Telefoon" name="telefoon" value={form.telefoon} onChange={handleChange} />
            <Input label="Straat en nr." name="street" value={form.street} onChange={handleChange} />
            <Input label="Postcode" name="postal_code" value={form.postal_code} onChange={handleChange} />
            <Input label="Gemeente / Stad" name="city" value={form.city} onChange={handleChange} />
            <Input label="Landcode" name="country_code" value={form.country_code} onChange={handleChange} />
            <div className="md:col-span-2 space-y-2">
              <label className="terminal-label" htmlFor="adres">
                Adres (vrij veld)
              </label>
              <textarea
                id="adres"
                name="adres"
                rows={3}
                className="terminal-input"
                value={form.adres}
                onChange={handleChange}
              />
            </div>
            <Input
              label="Peppol ID (optioneel)"
              name="peppol_endpoint_id"
              value={form.peppol_endpoint_id}
              onChange={handleChange}
            />
            <Input
              label="Peppol scheme"
              name="peppol_scheme"
              value={form.peppol_scheme}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end gap-3">
            {isEditing && (
              <button type="button" className="terminal-button is-ghost" onClick={resetForm}>
                Annuleren
              </button>
            )}
            <button type="submit" className="terminal-button is-accent">
              {isEditing ? "Klant bijwerken" : "Klant toevoegen"}
            </button>
          </div>
        </form>
      </section>

      <section className="terminal-card space-y-5">
        <div className="space-y-3">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="terminal-section-title">Klantenlijst</p>
              <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
                Overzicht ({filteredClients.length})
              </h2>
            </div>
            {clients.length > 0 && (
              <span className="terminal-pill text-xs tracking-[0.12em] text-gridline/80">
                Totaal {clients.length} klant{clients.length === 1 ? "" : "en"}
              </span>
            )}
          </header>

          <div className="grid gap-3 md:grid-cols-3">
            {statCards.map((card) => (
              <div key={card.key} className="rounded-card border border-gridline/50 bg-parchment/80 p-4 shadow-terminal-inset">
                <p className="terminal-label text-xs uppercase tracking-[0.14em] text-gridline/70">{card.label}</p>
                <p className="text-2xl font-semibold tracking-[0.12em] text-base-soft">{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="klantZoek" className="terminal-label">
            Zoek op naam, bedrijf, e-mail of telefoon
          </label>
          <input
            id="klantZoek"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Bijvoorbeeld 'Atelier' of 'info@'"
            className="terminal-input text-sm tracking-[0.08em] text-ink"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const isActive = filter.key === activeFilter;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`terminal-pill text-xs tracking-[0.14em] transition ${
                    isActive ? "border-primary text-primary" : "text-gridline/80"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1 lg:w-48">
            <label htmlFor="sortKlanten" className="terminal-label">
              Sorteer op
            </label>
            <select
              id="sortKlanten"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
              className="terminal-input text-sm tracking-[0.08em] text-ink"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="terminal-note">Klanten laden...</p>
        ) : filteredClients.length === 0 ? (
          <p className="terminal-note">
            {clients.length === 0
              ? "Nog geen klanten toegevoegd."
              : `Geen resultaten voor "${searchTerm.trim()}".`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-gridline/70">
                  <th className="pb-2 pr-4 font-medium">Naam / Bedrijf</th>
                  <th className="pb-2 pr-4 font-medium">Contact</th>
                  <th className="pb-2 pr-4 font-medium">Adres</th>
                  <th className="pb-2 pr-4 font-medium">BTW</th>
                  <th className="pb-2 font-medium text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gridline/30">
                {sortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-parchment/70 transition-colors">
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/klanten/${client.id}`)}
                        className="text-left w-full hover:text-primary transition-colors"
                        title="Bekijk klantstatistieken"
                      >
                        <p className="font-semibold tracking-[0.08em] uppercase">
                          {highlightMatch(client.naam || "Onbekend", normalizedSearch)}
                        </p>
                        {client.bedrijf && (
                          <p className="text-xs text-gridline/70">
                            {highlightMatch(client.bedrijf, normalizedSearch)}
                          </p>
                        )}
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-xs leading-5 text-gridline/90">
                      <p>{highlightMatch(client.email || "Geen e-mail", normalizedSearch)}</p>
                      <p>{highlightMatch(client.telefoon || "Geen telefoon", normalizedSearch)}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs leading-5 text-gridline/90">
                      {highlightMatch(
                        formatAddressDisplay(client) || "Geen adres",
                        normalizedSearch
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs leading-5 text-gridline/90">
                      {highlightMatch(client.btw_nummer || "-", normalizedSearch)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {client.email && (
                          <a
                            href={`mailto:${client.email}`}
                            className="terminal-pill text-xs tracking-[0.12em]"
                            title="Stuur e-mail"
                          >
                            Mail
                          </a>
                        )}
                        {client.telefoon && (
                          <a
                            href={`tel:${client.telefoon}`}
                            className="terminal-pill text-xs tracking-[0.12em]"
                            title="Bel klant"
                          >
                            Bel
                          </a>
                        )}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Input({ label, name, value, onChange, required = false, type = "text" }) {
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
        required={required}
        onChange={onChange}
        className="terminal-input"
      />
    </div>
  );
}

function formatStructuredAddress(client) {
  if (!client) return "";
  const line1 = client.street ? client.street : "";
  const line2Parts = [client.postal_code, client.city].filter(Boolean).join(" ");
  const country = client.country_code || "";
  return [line1, line2Parts, country].filter(Boolean).join(", ");
}

function formatAddressDisplay(client) {
  if (!client) return "";
  const parts = [];
  if (client.street) parts.push(client.street);
  const cityLine = [client.postal_code, client.city].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);
  if (client.country_code && parts.join(", ").toLowerCase().indexOf(client.country_code.toLowerCase()) === -1) {
    parts.push(client.country_code);
  }
  return parts.join(", ");
}

function highlightMatch(value, term) {
  const text = value ?? "";
  if (!term) {
    return text;
  }
  const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
  const parts = String(text).split(pattern);

  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="bg-primary/20 text-primary px-0.5">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
