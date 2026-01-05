import { useState } from "react";
import { baseUrl } from "../lib/constants";

export default function ClientAddModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viesStatus, setViesStatus] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setViesStatus(null);
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/save-client.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Opslaan mislukt");
      }

      onSave({ ...form, id: result.id });

      setForm({
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
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViesLookup = async () => {
    const vat = form.btw_nummer?.trim();
    if (!vat) {
      setError("Vul eerst een BTW-nummer in.");
      return;
    }
    setError("");
    setViesStatus({ state: "loading", message: "VIES controle..." });
    try {
      const response = await fetch(`${baseUrl}/check-vat.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vat_number: vat, country_code: form.country_code || undefined }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "VIES controle mislukt");
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
          const m = last.match(/(\\d{3,10})\\s+(.*)/);
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
    } catch (err) {
      setViesStatus({ state: "error", message: err.message });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="terminal-card w-full max-w-lg space-y-4 shadow-terminal-glow">
        <header className="space-y-2">
          <p className="terminal-section-title">Nieuwe klant</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Klant toevoegen
          </h2>
        </header>

        {error && (
          <p className="text-sm text-signal-red tracking-[0.08em]">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            name="naam"
            placeholder="Naam *"
            required
            value={form.naam}
            onChange={handleChange}
          />
          <Input
            name="bedrijf"
            placeholder="Bedrijf"
            value={form.bedrijf}
            onChange={handleChange}
          />
          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
        <Input
            name="btw_nummer"
            placeholder="BTW-nummer"
            value={form.btw_nummer}
            onChange={handleChange}
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="terminal-button is-ghost text-xs tracking-[0.12em]"
              onClick={handleViesLookup}
              disabled={loading}
            >
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
          <Input
            name="street"
            placeholder="Straat en nummer (voor Peppol)"
            value={form.street}
            onChange={handleChange}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="postal_code"
              placeholder="Postcode"
              value={form.postal_code}
              onChange={handleChange}
            />
            <Input
              name="city"
              placeholder="Gemeente / Stad"
              value={form.city}
              onChange={handleChange}
            />
          </div>
          <Input
            name="country_code"
            placeholder="Landcode (bv. BE)"
            value={form.country_code}
            onChange={handleChange}
          />
          <Input
            name="adres"
            placeholder="Adres"
            value={form.adres}
            onChange={handleChange}
          />
          <Input
            name="telefoon"
            placeholder="Telefoon"
            value={form.telefoon}
            onChange={handleChange}
          />
          <Input
            name="peppol_endpoint_id"
            placeholder="Peppol ID (optioneel)"
            value={form.peppol_endpoint_id}
            onChange={handleChange}
          />
          <Input
            name="peppol_scheme"
            placeholder="Peppol scheme (bv. 9956)"
            value={form.peppol_scheme}
            onChange={handleChange}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="terminal-button is-ghost"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="terminal-button is-accent"
              disabled={loading}
            >
              {loading ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ name, onChange, ...props }) {
  return (
    <input
      {...props}
      name={name}
      className="terminal-input"
      onChange={onChange}
    />
  );
}
