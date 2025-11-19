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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
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
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
