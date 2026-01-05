import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { baseUrl } from "../lib/constants";

import { SettingsContext } from "../context/SettingsContext";
import TerminalBackButton from "../components/TerminalBackButton";

const COST_FIELDS = [
  {
    name: "standaardWinstmarge",
    label: "Standaard winstmarge",
    helper: "Percentage marge dat standaard op materiaal- en printkosten wordt gezet.",
    suffix: "%",
    min: 0,
    type: "number",
  },
  {
    name: "elektriciteitsprijs",
    label: "Elektriciteitsprijs",
    helper: "Gemiddelde kWh-kost voor productie. Per offerte overschrijfbaar.",
    suffix: "EUR/kWh",
    min: 0,
    step: 0.001,
    type: "number",
  },
  {
    name: "vasteStartkost",
    label: "Vaste startkost",
    helper: "Voorbereiding, slicing, machine-opstart ? eenmalig per offerte.",
    suffix: "EUR",
    min: 0,
    step: 0.1,
    type: "number",
  },
  {
    name: "vervoerskost",
    label: "Vervoerskost",
    helper: "Standaard transport- of leveringskost. Aanpasbaar per offerte.",
    suffix: "EUR",
    min: 0,
    step: 0.1,
    type: "number",
  },
  {
    name: "modelleringTarief",
    label: "Modelleringsuurtarief",
    helper: "Uurtarief voor 3D-modellering. Gebruikt bij items met ontwerpwerk.",
    suffix: "EUR/u",
    min: 0,
    step: 0.5,
    type: "number",
    featured: true,
  },
];

const TAX_FIELDS = [
  {
    name: "btw",
    label: "BTW-tarief",
    helper: "Percentage btw dat op de offerte wordt toegepast.",
    suffix: "%",
    min: 0,
    type: "number",
  },
  {
    name: "korting",
    label: "Standaard korting",
    helper: "Automatische korting die op nieuwe offertes wordt voorgesteld.",
    suffix: "%",
    min: 0,
    type: "number",
  },
];

const NAV_LINKS = [
  {
    to: "/instellingen/fabrikanten",
    label: "Fabrikanten beheren",
    description: "Beheer leveranciers en koppel materialen aan de juiste producent.",
    emoji: "↗",
  },
  {
    to: "/materialen",
    label: "Materialen beheren",
    description: "Pas filamentprijzen, droogvereisten en voorraadposities aan.",
    emoji: "???",
  },
  {
    to: "/instellingen/klanten",
    label: "Klanten beheren",
    description: "Houd klantgegevens bij voor koppeling aan offertes en facturen.",
    emoji: "?",
  },
  {
    to: "/instellingen/prijslijsten",
    label: "Prijslijsten",
    description: "Beheer klant- of materiaalgebonden prijsregels en marges.",
    emoji: "?",
  },
];


export default function SettingsPage() {
  const { settings, saveSettings, loading } = useContext(SettingsContext);
  const emptyForm = {
    standaardWinstmarge: "",
    elektriciteitsprijs: "",
    vasteStartkost: "",
    vervoerskost: "",
    modelleringTarief: "",
    btw: "",
    korting: "",
    companyName: "",
    companyAddress: "",
    companyEmail: "",
    companyPhone: "",
    logoUrl: "",
    vatNumber: "",
    termsText: "",
    termsUrl: "",
    iban: "",
    bic: "",
    companyStreet: "",
    companyPostalCode: "",
    companyCity: "",
    companyCountryCode: "BE",
    peppolEndpointId: "",
    peppolScheme: "",
    defaultDueDays: 14,
    paymentTerms: "",
  };

  const [formData, setFormData] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(extractFormValues(settings));
    }
  }, [settings]);

  const overviewMetrics = useMemo(
    () => [
      {
        key: "standaardWinstmarge",
        label: "Marge",
        value: formData.standaardWinstmarge,
        suffix: "%",
      },
      {
        key: "elektriciteitsprijs",
        label: "kWh-kost",
        value: formData.elektriciteitsprijs,
        suffix: "EUR",
      },
      {
        key: "modelleringTarief",
        label: "Modellering",
        value: formData.modelleringTarief,
        suffix: "EUR/u",
      },
      {
        key: "btw",
        label: "BTW",
        value: formData.btw,
        suffix: "%",
      },
    ],
    [formData]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append("logo", file);
    try {
      const res = await fetch(`${baseUrl}/upload-logo.php`, {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Upload mislukt");
      setFormData((prev) => ({ ...prev, logoUrl: data.url }));
      setStatus({ type: "success", message: "Logo geüpload." });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Upload mislukt." });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    const prepared = {
      standaardWinstmarge: parseFloat(formData.standaardWinstmarge || 0),
      elektriciteitsprijs: parseFloat(formData.elektriciteitsprijs || 0),
      vasteStartkost: parseFloat(formData.vasteStartkost || 0),
      vervoerskost: parseFloat(formData.vervoerskost || 0),
      modelleringTarief: parseFloat(formData.modelleringTarief || 0),
      btw: parseFloat(formData.btw || 0),
      korting: parseFloat(formData.korting || 0),
      companyName: formData.companyName,
      companyAddress: formData.companyAddress,
      companyEmail: formData.companyEmail,
      companyPhone: formData.companyPhone,
      logoUrl: formData.logoUrl,
      vatNumber: formData.vatNumber,
      termsText: formData.termsText,
      termsUrl: formData.termsUrl,
      iban: formData.iban,
      bic: formData.bic,
      companyStreet: formData.companyStreet,
      companyPostalCode: formData.companyPostalCode,
      companyCity: formData.companyCity,
      companyCountryCode: formData.companyCountryCode || "BE",
      peppolEndpointId: formData.peppolEndpointId,
      peppolScheme: formData.peppolScheme,
      defaultDueDays: Number(formData.defaultDueDays || 14),
      paymentTerms: formData.paymentTerms,
    };

    try {
      await saveSettings(prepared);
      setStatus({ type: "success", message: "Instellingen succesvol opgeslagen." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Opslaan mislukt. Probeer later opnieuw.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Instellingen laden...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Configuratie</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">
              Offr3D instellingen
            </h1>
          </div>
          <TerminalBackButton label="Terug naar dashboard" to="/" />
        </div>
        <p className="text-sm text-gridline/70">
          Beheer de standaardparameters voor prijzen, modellering en fiscale regels. Deze
          waarden worden voorgesteld bij elke nieuwe offerte en kunnen daar nog worden
      aangepast.
        </p>
      </header>

      <section className="terminal-card space-y-4">
        <p className="terminal-section-title">Huidige parameters</p>
        <div className="terminal-grid md:grid-cols-4">
          {overviewMetrics.map(({ key, ...metricProps }) => (
            <MetricBadge key={key} {...metricProps} />
          ))}
        </div>
        <p className="terminal-note">
          Pas de waardes hieronder aan en klik vervolgens op &ldquo;Instellingen
          opslaan&rdquo; om ze te bewaren.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="min-h-[80px] transition-all duration-200">
          {status && (
            <Alert
              type={status.type}
              message={status.message}
              onDismiss={() => setStatus(null)}
            />
          )}
        </div>

        <Section
          title="Kosteninstellingen"
          description="Basistarieven die gebruikt worden om productie- en materiaalcalculaties op te bouwen."
        >
          {COST_FIELDS.map((field) => (
            <InputField
              key={field.name}
              {...field}
              value={formData[field.name]}
              onChange={handleChange}
            />
          ))}
        </Section>

        <Section
          title="Fiscale instellingen"
          description="Worden standaard toegepast bij de opmaak van een offerte."
        >
          {TAX_FIELDS.map((field) => (
            <InputField
              key={field.name}
              {...field}
              value={formData[field.name]}
              onChange={handleChange}
            />
          ))}
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="terminal-note">
            Opslaan past de waarden onmiddellijk toe voor toekomstige offertes.
          </span>
          <div className="flex gap-3">
          <button
            type="button"
            className="terminal-button is-ghost"
            onClick={() => settings && setFormData(extractFormValues(settings))}
            disabled={saving}
          >
            Herladen
          </button>
            <button type="submit" className="terminal-button is-accent" disabled={saving}>
              {saving ? "Opslaan..." : "Instellingen opslaan"}
            </button>
          </div>
        </div>
      </form>


        <Section
          title="Bedrijfsgegevens"
          description="Wordt gebruikt op offertes/facturen en Peppol-adressering."
        >
          <InputField
            label="Bedrijfsnaam"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
          />
          <InputField
            label="Straat en nummer"
            name="companyStreet"
            value={formData.companyStreet}
            onChange={handleChange}
            placeholder="Bijv. Industrielaan 12"
          />
          <InputField
            label="Postcode"
            name="companyPostalCode"
            value={formData.companyPostalCode}
            onChange={handleChange}
            placeholder="1000"
          />
          <InputField
            label="Gemeente / Stad"
            name="companyCity"
            value={formData.companyCity}
            onChange={handleChange}
            placeholder="Brussel"
          />
          <InputField
            label="Landcode"
            name="companyCountryCode"
            value={formData.companyCountryCode}
            onChange={handleChange}
            placeholder="BE"
          />
          <InputField
            label="Adres (vrij veld)"
            name="companyAddress"
            value={formData.companyAddress}
            onChange={handleChange}
            placeholder="Straat, nummer, plaats"
          />
          <InputField
            label="E-mail"
            name="companyEmail"
            value={formData.companyEmail}
            onChange={handleChange}
            type="email"
          />
          <InputField
            label="Telefoon"
            name="companyPhone"
            value={formData.companyPhone}
            onChange={handleChange}
          />
          <InputField
            label="VAT-nummer"
            name="vatNumber"
            value={formData.vatNumber}
            onChange={handleChange}
            placeholder="BE0123.456.789"
          />
          <div className="space-y-2 md:col-span-2">
            <label className="terminal-label">Logo URL</label>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                className="terminal-input flex-1"
                placeholder="https://... of /offr3d/uploads/quote-logo.png"
              />
              <label className="terminal-button is-ghost text-xs tracking-[0.12em] cursor-pointer">
                Upload logo
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
            <p className="text-xs text-gridline/70">
              Bestand wordt opgeslagen in /offr3d/uploads/. Ondersteund: PNG, JPG, SVG.
            </p>
          </div>
        </Section>

        <Section
          title="Facturatie & betalingen"
          description="IBAN/BIC, standaard vervaldagen en betaalinstructies voor facturen."
        >
          <InputField
            label="IBAN"
            name="iban"
            value={formData.iban}
            onChange={handleChange}
            placeholder="BE68 5390 0754 7034"
          />
          <InputField
            label="BIC"
            name="bic"
            value={formData.bic}
            onChange={handleChange}
            placeholder="GEBABEBB"
          />
          <InputField
            label="Standaard betalingstermijn (dagen)"
            name="defaultDueDays"
            value={formData.defaultDueDays}
            onChange={handleChange}
            type="number"
            min={1}
            step={1}
          />
          <div className="md:col-span-2 space-y-2">
            <label className="terminal-label" htmlFor="paymentTerms">
              Betaalvoorwaarden
            </label>
            <textarea
              id="paymentTerms"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleChange}
              className="terminal-input min-h-[120px]"
              placeholder="Bijv. Te betalen binnen 14 dagen via overschrijving op IBAN..."
            />
          </div>
        </Section>

        <Section
          title="Peppol"
          description="Deelnemer-ID voor Peppol facturatie (Belgische standaard: scheme 9956 + VAT/KBO)."
        >
          <InputField
            label="Peppol Participant ID"
            name="peppolEndpointId"
            value={formData.peppolEndpointId}
            onChange={handleChange}
            placeholder="BE0123456789"
          />
          <InputField
            label="Peppol SchemeID"
            name="peppolScheme"
            value={formData.peppolScheme}
            onChange={handleChange}
            placeholder="9956"
          />
        </Section>


        <Section
          title="Voorwaarden"
          description="Voeg tekstuele voorwaarden toe. Deze komen onderaan de offerte-PDF."
        >
          <InputField
            label="Voorwaarden URL (optioneel PDF)"
            name="termsUrl"
            value={formData.termsUrl}
            onChange={handleChange}
            placeholder="https://... of /offr3d/uploads/voorwaarden.pdf"
          />
          <div className="md:col-span-2 space-y-2">
            <label className="terminal-label" htmlFor="termsText">Voorwaarden (tekst)</label>
            <textarea
              id="termsText"
              name="termsText"
              value={formData.termsText}
              onChange={handleChange}
              className="terminal-input min-h-[120px]"
              placeholder="Bijvoorbeeld leverings- en betalingsvoorwaarden"
            />
          </div>
        </Section>

      <nav className="terminal-card space-y-4">
        <h2 className="text-xl font-semibold tracking-dial uppercase">
          Verdere configuratie
        </h2>
        <p className="text-sm text-gridline/70">
          Beheer aanvullende gegevensbronnen voor offertes en productie.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {NAV_LINKS.map((link) => (
            <LinkCard key={link.to} {...link} />
          ))}
        </div>
      </nav>
    </main>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="terminal-card space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          {title}
        </h3>
        <p className="text-sm text-gridline/70">{description}</p>
      </div>
      <div className="terminal-grid md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  helper,
  suffix,
  min,
  step = "any",
  featured = false,
  placeholder = "",
}) {
  return (
    <div
      className={`space-y-2 ${featured ? "bg-parchment-light/80 border border-gridline/50 rounded-card p-4" : ""
        }`}
    >
      <label htmlFor={name} className="terminal-label flex items-center justify-between">
        <span>{label}</span>
        {suffix && (
          <span className="terminal-note text-[0.6rem] tracking-[0.14em] text-gridline/70">
            {suffix}
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
        type={type}
        name={name}
        id={name}
        step={step}
        min={min}
        value={value}
        onChange={onChange}
        className="terminal-input"
        placeholder={placeholder}
      />
      </div>
      {helper && <p className="text-xs text-gridline/70">{helper}</p>}
    </div>
  );
}

function MetricBadge({ label, value, suffix }) {
  const formatted = formatDisplayValue(value, suffix);

  return (
    <div className="rounded-card border border-gridline/60 bg-parchment/80 p-4 shadow-terminal-inset space-y-1">
      <p className="terminal-label">{label}</p>
      <p className="text-lg font-semibold tracking-[0.12em] text-base-soft">{formatted}</p>
    </div>
  );
}

const ALERT_TONES = {
  success: {
    container: "border-signal-green/60 bg-signal-green/15",
    text: "text-signal-green",
  },
  error: {
    container: "border-signal-red/60 bg-signal-red/15",
    text: "text-signal-red",
  },
  info: {
    container: "border-primary/60 bg-primary/10",
    text: "text-primary",
  },
};

function Alert({ type = "info", message, onDismiss }) {
  const tone = ALERT_TONES[type] ?? ALERT_TONES.info;

  return (
    <div
      className={`rounded-card border ${tone.container} p-4 flex items-start justify-between gap-4`}
    >
      <p className={`text-sm tracking-[0.08em] ${tone.text}`}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="terminal-button is-ghost text-xs tracking-[0.12em]"
      >
        Sluiten
      </button>
    </div>
  );
}

function extractFormValues(source) {
  return {
    standaardWinstmarge: source.standaardWinstmarge ?? "",
    elektriciteitsprijs: source.elektriciteitsprijs ?? "",
    vasteStartkost: source.vasteStartkost ?? "",
    vervoerskost: source.vervoerskost ?? "",
    modelleringTarief: source.modelleringTarief ?? "",
    btw: source.btw ?? "",
    korting: source.korting ?? "",
    companyName: source.companyName ?? "",
    companyAddress: source.companyAddress ?? "",
    companyEmail: source.companyEmail ?? "",
    companyPhone: source.companyPhone ?? "",
    logoUrl: source.logoUrl ?? "",
    vatNumber: source.vatNumber ?? "",
    termsText: source.termsText ?? "",
    termsUrl: source.termsUrl ?? "",
    iban: source.iban ?? "",
    bic: source.bic ?? "",
    companyStreet: source.companyStreet ?? "",
    companyPostalCode: source.companyPostalCode ?? "",
    companyCity: source.companyCity ?? "",
    companyCountryCode: source.companyCountryCode ?? "BE",
    peppolEndpointId: source.peppolEndpointId ?? "",
    peppolScheme: source.peppolScheme ?? "",
    defaultDueDays: source.defaultDueDays ?? 14,
    paymentTerms: source.paymentTerms ?? "",
  };
}

function formatDisplayValue(value, suffix) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `${value}${suffix ? ` ${suffix}` : ""}`;
  }

  const formatted =
    Math.abs(numeric) >= 100
      ? numeric.toFixed(0)
      : Math.abs(numeric) >= 10
        ? numeric.toFixed(1)
        : numeric.toFixed(2);

  return `${formatted}${suffix ? ` ${suffix}` : ""}`;
}

function LinkCard({ to, label, description, emoji }) {
  return (
    <Link
      to={to}
      className="group rounded-card border border-gridline/50 bg-parchment/85 p-4 shadow-terminal transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-terminal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xl" aria-hidden="true">
          {emoji}
        </span>
        <span className="terminal-pill group-hover:border-primary/70 group-hover:text-primary transition-colors duration-200">
          {label}
        </span>
      </div>
      <p className="mt-3 text-xs tracking-[0.08em] text-gridline/70 leading-relaxed">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-2 text-primary tracking-[0.12em] text-xs uppercase">
        <span>Open module</span>
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
