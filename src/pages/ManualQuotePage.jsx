import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ClientSelector from "../components/ClientSelector";
import ClientAddModal from "../components/ClientAddModal";
import CustomItemList from "../components/CustomItemList";
import SummarySection from "../components/SummarySection";
import TerminalBackButton from "../components/TerminalBackButton";
import { SettingsContext } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import calculateQuoteCost from "../lib/calculateQuoteCost";
import { baseUrl } from "../lib/constants";

const INITIAL_CUSTOM_ITEM = {
  title: "",
  description: "",
  quantity: 1,
  unit: "stuk",
  cost_amount: 0,
  price_amount: 0,
  margin_percent: 0,
  vat_percent: 0,
  is_optional: false,
  is_selected: true,
  group_ref: "",
};

const DEFAULT_FORM = {
  offertenummer: "",
  offertedatum: new Date().toISOString().split("T")[0],
  korting: 0,
  btw: 0,
  btwVrijgesteld: true,
  btwVrijTekst: "",
  geldigheid_dagen: 30,
  levertermijn: "",
  betalingsvoorwaarden: "",
  klant_referentie: "",
  aanbetaling_perc: 0,
  akkoord_instructie: "",
};

export default function ManualQuotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);
  const { settings } = useContext(SettingsContext);
  const { showToast } = useToast();

  const [client, setClient] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [customItems, setCustomItems] = useState([{ ...INITIAL_CUSTOM_ITEM }]);
  const [loading, setLoading] = useState(false);
  const [priceRules, setPriceRules] = useState([]);
  const [priceRulesLoaded, setPriceRulesLoaded] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    if (priceRulesLoaded) return;
    fetch(`${baseUrl}/get-price-rules.php`, { cache: "no-store" })
      .then((res) => res.json())
      .then((rules) => setPriceRules(Array.isArray(rules) ? rules : []))
      .catch(() => setPriceRules([]))
      .finally(() => setPriceRulesLoaded(true));
  }, [priceRulesLoaded]);

  useEffect(() => {
    if (!settings) return;
    setForm((prev) => ({
      ...prev,
      offertenummer: prev.offertenummer,
      korting: settings.korting ?? prev.korting,
      btw: typeof settings.btw === "number" ? settings.btw : prev.btw,
      btwVrijgesteld: settings.btw === 0,
      btwVrijTekst: settings.btw === 0 ? "Vrijstelling (0%)" : prev.btwVrijTekst,
      betalingsvoorwaarden: settings.payment_terms ?? prev.betalingsvoorwaarden,
      levertermijn: settings.defaultDeliveryTerms ?? prev.levertermijn,
      geldigheid_dagen: settings.defaultValidityDays ?? prev.geldigheid_dagen,
      akkoord_instructie: settings.defaultApprovalNote ?? prev.akkoord_instructie,
    }));
  }, [settings]);

  useEffect(() => {
    async function loadQuote() {
      if (!editId) return;
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/get-quote-detail.php?id=${editId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Kon offerte niet laden");
        const data = await res.json();
        if (data?.error) throw new Error(data.error);

        const { offerte, custom_items: customQuoteItems } = data;
        setClient(
          offerte.client_id
            ? {
                id: offerte.client_id,
                naam: offerte.klant_naam,
                bedrijf: offerte.klant_bedrijf,
                email: offerte.klant_email,
                street: offerte.adres,
              }
            : null
        );
        setForm((prev) => ({
          ...prev,
          offertenummer: offerte.quote_number ?? prev.offertenummer,
          offertedatum: offerte.datum ?? prev.offertedatum,
          korting: Number(offerte.korting_perc ?? prev.korting),
          btw: Number(offerte.btw_perc ?? prev.btw),
          btwVrijgesteld: Boolean(offerte.vat_exempt) || Number(offerte.btw_perc ?? 0) === 0,
          btwVrijTekst: offerte.vat_exempt_reason ?? prev.btwVrijTekst,
          geldigheid_dagen: Number(offerte.validity_days ?? prev.geldigheid_dagen),
          levertermijn: offerte.delivery_terms ?? prev.levertermijn,
          betalingsvoorwaarden: offerte.payment_terms ?? prev.betalingsvoorwaarden,
          klant_referentie: offerte.customer_reference ?? prev.klant_referentie,
          akkoord_instructie: offerte.approval_note ?? prev.akkoord_instructie,
        }));
        setCustomItems(
          (customQuoteItems || []).map((custom) => ({
            ...INITIAL_CUSTOM_ITEM,
            id: custom.id,
            title: custom.title ?? "",
            description: custom.description ?? "",
            quantity: Number(custom.quantity ?? 1),
            unit: custom.unit ?? "stuk",
            cost_amount: Number(custom.cost_amount ?? 0),
            price_amount: Number(custom.price_amount ?? 0),
            margin_percent: Number(custom.margin_percent ?? 0),
            vat_percent: Number(custom.vat_percent ?? 0),
            is_optional: Boolean(custom.is_optional),
            is_selected: custom.is_selected === 0 ? false : true,
            group_ref: custom.group_ref ?? "",
          })) || [{ ...INITIAL_CUSTOM_ITEM }]
        );
      } catch (err) {
        showToast({ type: "error", message: err.message || "Kon offerte niet laden." });
        navigate("/offertes");
      } finally {
        setLoading(false);
      }
    }
    loadQuote();
  }, [editId, navigate, showToast]);

  const summary = useMemo(() => {
    if (!settings) return null;
    return calculateQuoteCost([], form, settings, priceRules, {
      clientId: client?.id,
      customItems,
    });
  }, [form, settings, priceRules, client?.id, customItems]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!client) {
      showToast({ type: "warning", message: "Selecteer eerst een klant." });
      return;
    }

    const hasCustom = customItems.some((item) => Number(item.quantity ?? 0) > 0 && Number(item.price_amount ?? 0) >= 0);
    if (!hasCustom) {
      showToast({ type: "warning", message: "Voeg minstens één custom regel toe met prijs." });
      return;
    }

    if (!summary) {
      showToast({ type: "error", message: "Geen samenvatting beschikbaar." });
      return;
    }

    try {
      const payload = {
        client_id: client.id,
        form,
        items: [],
        custom_items: prepareCustomItemsForPayload(customItems),
        summary,
      };

      const endpoint = isEditing ? "update-quote.php" : "save-quote.php";
      const res = await fetch(`${baseUrl}/${endpoint}${isEditing ? "" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...payload, id: editId } : payload),
      });
      const data = await res.json();
      if (!res.ok || data.error || (!data.success && !data.quote_id)) {
        throw new Error(data.error || "Opslaan mislukt.");
      }
      const quoteId = isEditing ? editId : data.quote_id;
      showToast({ type: "success", message: `Offerte ${isEditing ? "bijgewerkt" : "opgeslagen"}.` });
      navigate(`/offertes/${quoteId}`);
    } catch (err) {
      showToast({ type: "error", message: err.message || "Onbekende fout." });
    }
  };

  if (loading || !settings) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Offerte laden...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Handmatige offerte</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">
              {isEditing ? "Offerte bewerken" : "Nieuwe handmatige offerte"}
            </h1>
          </div>
          <TerminalBackButton to="/offertes" label="Terug naar overzicht" />
        </div>
        <p className="text-sm text-gridline/70">
          Maak een custom offerte met vrije regels. Klant kan via VIES worden opgezocht; bedrijfsgegevens uit instellingen worden meegegeven.
        </p>
      </header>

      <section className="terminal-card space-y-3 bg-parchment/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="terminal-section-title">Workflow</p>
            <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Handmatige offerte</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="terminal-pill text-xs tracking-[0.12em]">
              {isEditing ? `Bewerken #${editId}` : "Nieuwe offerte"}
            </span>
            <span className="terminal-pill text-xs tracking-[0.12em]">{customItems.length} regel(s)</span>
          </div>
        </div>
        <p className="text-sm text-gridline/75">
          Stap 1: klant selecteren. Stap 2: voorwaarden invullen. Stap 3: custom regels toevoegen en opslaan.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="terminal-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="terminal-section-title">Klant</p>
                <h2 className="text-xl font-semibold tracking-dial uppercase">Selecteer klant</h2>
                <p className="text-sm text-gridline/75">Gebruik VIES/klantenbeheer om bedrijfsgegevens op te halen.</p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-md border border-gridline/70 bg-base-highlight/20 text-base-soft shadow-terminal hover:-translate-y-0.5 hover:shadow-terminal-glow transition flex items-center justify-center"
                onClick={() => setIsClientModalOpen(true)}
                title="Nieuwe klant"
                aria-label="Nieuwe klant"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[240px]">
                <ClientSelector selectedClient={client} setSelectedClient={setClient} />
              </div>
              <Link
                to="/instellingen/klanten"
                className="terminal-button is-ghost text-xs tracking-[0.12em]"
              >
                Klanten beheren
              </Link>
            </div>
            {client && (
              <p className="text-xs text-gridline/70">
                {client.naam} {client.bedrijf ? `/ ${client.bedrijf}` : ""} — {client.street || "Adres onbekend"}
              </p>
            )}
          </section>

          <section className="terminal-card space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Offertenummer" value={form.offertenummer} onChange={(v) => handleFormChange("offertenummer", v)} />
              <Field label="Offertedatum" type="date" value={form.offertedatum} onChange={(v) => handleFormChange("offertedatum", v)} />
              <Field label="Geldigheid (dagen)" type="number" value={form.geldigheid_dagen} onChange={(v) => handleFormChange("geldigheid_dagen", Number(v) || 0)} />
              <Field label="Korting (%)" type="number" value={form.korting} onChange={(v) => handleFormChange("korting", Number(v) || 0)} />
              <Field label="Levertermijn" value={form.levertermijn} onChange={(v) => handleFormChange("levertermijn", v)} />
              <Field label="Betalingsvoorwaarden" value={form.betalingsvoorwaarden} onChange={(v) => handleFormChange("betalingsvoorwaarden", v)} />
              <Field label="Klantreferentie / PO" value={form.klant_referentie} onChange={(v) => handleFormChange("klant_referentie", v)} />
              <Field label="Aanbetaling (%)" type="number" value={form.aanbetaling_perc} onChange={(v) => handleFormChange("aanbetaling_perc", Number(v) || 0)} />
              <div className="space-y-2">
                <label className="terminal-label">BTW-regeling</label>
                <select
                  className="terminal-input"
                  value={form.btwVrijgesteld ? "exempt" : "standard"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      btwVrijgesteld: e.target.value === "exempt",
                      btw: e.target.value === "exempt" ? 0 : settings?.btw ?? prev.btw ?? 21,
                    }))
                  }
                >
                  <option value="standard">Standaard btw</option>
                  <option value="exempt">Vrijgesteld (0%)</option>
                </select>
              </div>
              {!form.btwVrijgesteld && (
                <Field label="BTW %" type="number" value={form.btw} onChange={(v) => handleFormChange("btw", Number(v) || 0)} />
              )}
              {form.btwVrijgesteld && (
                <Field label="Vrijstellingstekst" value={form.btwVrijTekst} onChange={(v) => handleFormChange("btwVrijTekst", v)} />
              )}
            </div>
            <div className="space-y-2">
              <label className="terminal-label">Opmerkingen</label>
              <textarea
                className="terminal-input min-h-[100px]"
                placeholder="Optioneel: extra voorwaarden of opmerkingen."
                value={form.opmerkingen || ""}
                onChange={(e) => handleFormChange("opmerkingen", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="terminal-label">Akkoord-instructie</label>
              <textarea
                className="terminal-input min-h-[80px]"
                placeholder="Bijv. 'Bevestig per e-mail' of 'Klik akkoord in de klantzone'."
                value={form.akkoord_instructie || ""}
                onChange={(e) => handleFormChange("akkoord_instructie", e.target.value)}
              />
            </div>
          </section>

          <CustomItemList
            items={customItems}
            onAddItem={() => setCustomItems((prev) => [...prev, { ...INITIAL_CUSTOM_ITEM }])}
            onUpdateItem={(index, item) => setCustomItems((prev) => prev.map((ci, i) => (i === index ? item : ci)))}
            onRemoveItem={(index) => setCustomItems((prev) => prev.filter((_, i) => i !== index))}
          />
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
          <section className="terminal-card space-y-3">
            <p className="terminal-section-title">Bedrijfsgegevens</p>
            <div className="text-sm text-gridline/80 space-y-1">
              <p>{settings?.companyName || "Bedrijfsnaam niet ingesteld"}</p>
              <p>
                {settings?.companyStreet} {settings?.companyPostalCode} {settings?.companyCity} ({settings?.companyCountryCode || "BE"})
              </p>
              <p>{settings?.companyEmail}</p>
              <p>{settings?.companyPhone}</p>
            </div>
          </section>

          <section className="terminal-card space-y-3">
            <p className="terminal-section-title">Voorwaarden & akkoord</p>
            <ul className="text-xs text-gridline/80 space-y-1">
              <li>• Geldig t/m: {form.geldigheid_dagen || 30} dagen na offertedatum</li>
              {form.aanbetaling_perc ? <li>• Aanbetaling: {Number(form.aanbetaling_perc).toFixed(1)}%</li> : <li>• Aanbetaling: n.v.t.</li>}
              <li>• Akkoord: {form.akkoord_instructie ? form.akkoord_instructie : "Voeg een akkoord-instructie toe."}</li>
              <li>
                • Algemene voorwaarden:{" "}
                {settings?.termsUrl ? (
                  <a className="text-primary underline" href={settings.termsUrl} target="_blank" rel="noreferrer">
                    openen
                  </a>
                ) : settings?.termsText ? (
                  "tekst beschikbaar"
                ) : (
                  "stel in via Instellingen > Voorwaarden"
                )}
              </li>
            </ul>
          </section>

          <div className="xl:hidden">
            <p className="terminal-section-title mb-2">Samenvatting</p>
          </div>
          <SummarySection summary={summary} />

          <div className="terminal-card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="terminal-section-title mb-0">Opslaan</p>
              {!client && <span className="terminal-pill text-xs tracking-[0.12em] text-gridline/70">Selecteer klant</span>}
            </div>
            <ul className="text-xs text-gridline/70 space-y-1">
              <li>• Offertenummer: {isEditing ? `#${editId}` : "wordt gegenereerd na opslaan"}</li>
              <li>• Geldigheid: {form.geldigheid_dagen || 30} dagen</li>
              <li>
                • Algemene voorwaarden:{" "}
                {settings?.termsUrl
                  ? "link ingesteld"
                  : settings?.termsText
                  ? "tekst ingesteld"
                  : "niet ingesteld (vul in bij Instellingen > Voorwaarden)"}
              </li>
            </ul>
            <button
              type="button"
              onClick={handleSave}
              className="terminal-button is-accent w-full disabled:opacity-60"
              disabled={!client}
            >
              {isEditing ? "Offerte bijwerken" : "Offerte opslaan"}
            </button>
          </div>
        </div>
      </div>
      <ClientAddModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={(newClient) => {
          if (newClient?.id) setClient(newClient);
          setIsClientModalOpen(false);
        }}
      />
    </main>
  );
}

function Field({ label, onChange, ...props }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="terminal-label">{label}</span>
      <input
        className="terminal-input"
        {...props}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function prepareCustomItemsForPayload(customItems = []) {
  if (!Array.isArray(customItems)) return [];
  return customItems.map((custom) => ({
    title: custom.title ?? "",
    description: custom.description ?? "",
    quantity: Number(custom.quantity ?? 1),
    unit: custom.unit || "stuk",
    cost_amount: Number(custom.cost_amount ?? 0),
    price_amount: Number(custom.price_amount ?? 0),
    margin_percent: Number(custom.margin_percent ?? 0),
    vat_percent: Number(custom.vat_percent ?? 0),
    is_optional: Boolean(custom.is_optional),
    is_selected: custom.is_optional ? Boolean(custom.is_selected) : true,
    group_ref: custom.group_ref || null,
  }));
}
