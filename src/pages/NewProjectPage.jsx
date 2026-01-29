import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import TerminalBackButton from "../components/TerminalBackButton";
import ClientSelector from "../components/ClientSelector";
import { baseUrl } from "../lib/constants";
import { useToast } from "../context/ToastContext";

const PRIORITIES = ["hoog", "normaal", "laag"];
const STATUSES = ["intake", "planning", "productie", "postprocessing", "klaar", "geleverd"];

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const prefillQuoteId = searchParams.get("quote");

  const [form, setForm] = useState({
    naam: "",
    client_id: null,
    quote_id: prefillQuoteId ? Number(prefillQuoteId) : null,
    status: "intake",
    prioriteit: "normaal",
    deadline: "",
    locatie: "",
    tags: "",
    notities: "",
  });

  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  useEffect(() => {
    if (prefillQuoteId) {
      setForm((prev) => ({ ...prev, quote_id: Number(prefillQuoteId) }));
    }
  }, [prefillQuoteId]);

  useEffect(() => {
    async function fetchQuotes() {
      try {
        setQuotesLoading(true);
        const res = await fetch(`${baseUrl}/get-quotes.php`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setQuotes(data);
        }
      } catch (e) {
        // stilzwijgend falen
      } finally {
        setQuotesLoading(false);
      }
    }
    fetchQuotes();
  }, []);

  const handleSave = async () => {
    if (!form.naam) {
      showToast({ type: "error", message: "Projectnaam is verplicht." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags : null,
        client_id: form.client_id || null,
        quote_id: form.quote_id || null,
      };
      const res = await fetch(`${baseUrl}/save-project.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Opslaan mislukt.");
      }
      showToast({ type: "success", message: "Project aangemaakt." });
      const newId = data.project_id ?? data.id;
      if (newId) {
        navigate(`/projecten/${newId}`);
      } else {
        navigate("/projecten");
      }
    } catch (e) {
      showToast({ type: "error", message: e.message || "Fout bij opslaan project." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Projecten</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase text-base-soft">Nieuw project</h1>
          </div>
          <div className="flex gap-2">
            <TerminalBackButton label="Terug naar projecten" to="/projecten" />
            <TerminalBackButton label="Terug naar dashboard" to="/" />
          </div>
        </div>
        <p className="text-sm text-gridline/70">Koppel optioneel een klant en offerte, stel status en prioriteit in.</p>
      </header>

      <section className="terminal-card space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledInput
            label="Projectnaam"
            value={form.naam}
            onChange={(val) => setForm((p) => ({ ...p, naam: val }))}
            required
          />
          <div className="space-y-2">
            <label className="terminal-label">Status</label>
            <select
              className="terminal-input"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="terminal-label">Prioriteit</label>
            <select
              className="terminal-input"
              value={form.prioriteit}
              onChange={(e) => setForm((p) => ({ ...p, prioriteit: e.target.value }))}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <LabeledInput
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={(val) => setForm((p) => ({ ...p, deadline: val }))}
          />
          <LabeledInput
            label="Locatie"
            value={form.locatie}
            onChange={(val) => setForm((p) => ({ ...p, locatie: val }))}
            placeholder="Rack, bin, werkbank..."
          />
          <div className="space-y-2">
            <label className="terminal-label">Offerte (optioneel)</label>
            <select
              className="terminal-input"
              value={form.quote_id || ""}
              onChange={(e) => setForm((p) => ({ ...p, quote_id: e.target.value ? Number(e.target.value) : null }))}
              disabled={quotesLoading}
            >
              <option value="">-- Geen koppeling --</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  #{q.id.toString().padStart(4, "0")} — {q.klant_naam || "Onbekend"} — {Number(q.totaal_bruto || 0).toFixed(2)} EUR
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <p className="terminal-label">Klant koppelen</p>
          <ClientSelector
            selectedClient={form.client_id ? { id: form.client_id } : null}
            setSelectedClient={(client) => setForm((p) => ({ ...p, client_id: client?.id ?? null }))}
          />
          <p className="text-xs text-gridline/70">Optioneel, kan later nog.</p>
        </div>

        <div className="space-y-3">
          <LabeledInput
            label="Tags (komma-gescheiden)"
            value={form.tags}
            onChange={(val) => setForm((p) => ({ ...p, tags: val }))}
            placeholder="PETG, batch, kleurwissel"
          />
          <div className="space-y-2">
            <label className="terminal-label" htmlFor="project-notes">
              Notities
            </label>
            <textarea
              id="project-notes"
              className="terminal-input min-h-[120px]"
              value={form.notities}
              onChange={(e) => setForm((p) => ({ ...p, notities: e.target.value }))}
              placeholder="Belangrijke info, materiaalbehoefte, planning..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gridline/70 space-y-1">
            <p>Project wordt opgeslagen als intake met optionele link naar offerte.</p>
            <p>Materiaal- en taakbeheer volgt op de detailpagina.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/projecten" className="terminal-button is-ghost text-xs">
              Annuleer
            </Link>
            <button
              type="button"
              className="terminal-button is-accent text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Opslaan..." : "Project opslaan"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function LabeledInput({ label, type = "text", value, onChange, placeholder = "", required = false }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="terminal-label">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        className="terminal-input"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
      />
    </label>
  );
}
