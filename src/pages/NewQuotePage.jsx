import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import QuoteForm from "../components/QuoteForm";
import PrintItemList from "../components/PrintItemList";
import CustomItemList from "../components/CustomItemList";
import SummarySection from "../components/SummarySection";
import calculateQuoteCost from "../lib/calculateQuoteCost";
import { SettingsContext } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import ClientSelector from "../components/ClientSelector";
import TerminalBackButton from "../components/TerminalBackButton";
import ClientAddModal from "../components/ClientAddModal";
import { baseUrl } from "../lib/constants";

const INITIAL_ITEM = {
  name: "",
  aantal: 1,
  hours: 0,
  minutes: 0,
  seconds: 0,
  weight: 0,
  filamentType: "",
  margin: 20,
  modelLink: "",
  supportmateriaal: false,
  modelleringNodig: false,
};

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
  aantalPrints: 1,
  meerderePrintbedden: false,
  groepeerPerBed: false,
  globaleWinstmarge: 0,
  gebruikGeenMarge: false,
  gebruikIndividueleMarges: false,
  elektriciteitsprijs: 0,
  overrideElektriciteitsprijs: false,
  vasteStartkost: 0,
  vervoerskost: 0,
  extraAllowances: 0,
  deliveryType: "afhaling",
  materialMarkup: 20,
  korting: 0,
  btw: 0,
  btwVrijgesteld: true,
  btwVrijTekst: "",
};

export default function NewQuotePage() {
  const { settings } = useContext(SettingsContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingQuoteId = searchParams.get("edit");
  const isEditing = Boolean(editingQuoteId);

  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [items, setItems] = useState([INITIAL_ITEM]);
  const [customItems, setCustomItems] = useState([]);
  const [formSyncKey, setFormSyncKey] = useState(0);
  const [quoteMode, setQuoteMode] = useState("print"); // "print" | "manual"
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteLoaded, setQuoteLoaded] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [priceRules, setPriceRules] = useState([]);
  const [priceRulesLoaded, setPriceRulesLoaded] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState("draft");
  const [validationMessages, setValidationMessages] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [dirtyItems, setDirtyItems] = useState(false);
  const [dirtyForm, setDirtyForm] = useState(false);

  const handleModeChange = useCallback((mode) => {
    setQuoteMode(mode);
    setDirtyItems(true);
    if (mode === "manual") {
      setItems([]);
      setCustomItems((prev) => (prev.length ? prev : [{ ...INITIAL_CUSTOM_ITEM }]));
    } else if (mode === "print") {
      setItems((prev) => (prev.length === 0 ? [{ ...INITIAL_ITEM }] : prev));
    }
  }, []);

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
    setForm((prev) => {
      if (isEditing && quoteLoaded) return prev;
      return {
        ...prev,
        globaleWinstmarge: settings.standaardWinstmarge ?? prev.globaleWinstmarge,
        elektriciteitsprijs: settings.elektriciteitsprijs ?? prev.elektriciteitsprijs,
        vasteStartkost: settings.vasteStartkost ?? prev.vasteStartkost,
        vervoerskost: settings.vervoerskost ?? prev.vervoerskost,
        materialMarkup: settings.materialMarkup ?? settings.materiaalOpslagPerc ?? prev.materialMarkup,
        korting: settings.korting ?? prev.korting,
        btw: typeof settings.btw === "number" ? settings.btw : 0,
        btwVrijgesteld: settings.btw === 0,
        btwVrijTekst: settings.btw === 0 ? "Vrijstelling (0%)" : prev.btwVrijTekst,
      };
    });
  }, [settings, isEditing, quoteLoaded]);

  useEffect(() => {
    if (isEditing) return;
    const modeParam = searchParams.get("mode");
    if (modeParam === "manual") {
      handleModeChange("manual");
    } else if (modeParam === "print") {
      handleModeChange("print");
    }
  }, [isEditing, searchParams]);

  useEffect(() => {
    if (!isEditing || !editingQuoteId) {
      setQuoteLoaded(false);
      return;
    }

    async function loadQuote() {
      try {
        setLoadingQuote(true);
        const response = await fetch(`${baseUrl}/get-quote-detail.php?id=${editingQuoteId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Offerte kon niet geladen worden.");
        }
        const data = await response.json();
        if (data?.error) {
          throw new Error(data.error);
        }

        const { offerte, items: quoteItems, custom_items: customQuoteItems } = data;
        setQuoteStatus(offerte.status || "draft");

        setSelectedClient(
          offerte.client_id
            ? {
                id: offerte.client_id,
                naam: offerte.klant_naam,
                bedrijf: offerte.klant_bedrijf,
                email: offerte.klant_email,
              }
            : null
        );

        const parseNum = (val) => {
          if (typeof val === "string") {
            const normalized = val.replace(",", ".");
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : 0;
          }
          const parsed = Number(val);
          return Number.isFinite(parsed) ? parsed : 0;
        };
        const parseBool = (val) => Number(val ?? 0) === 1 || val === true;

        const elekValue = parseFloat(offerte.elektriciteitskost_per_kwh ?? settings?.elektriciteitsprijs ?? 0);
        const elekOverride =
          offerte.elektriciteitskost_per_kwh !== null &&
          offerte.elektriciteitskost_per_kwh !== undefined &&
          !Number.isNaN(Number(offerte.elektriciteitskost_per_kwh));

        const formFromQuote = {
          ...DEFAULT_FORM,
          offertedatum: offerte.datum ?? DEFAULT_FORM.offertedatum,
          deliveryType: offerte.delivery_type || DEFAULT_FORM.deliveryType,
          globaleWinstmarge: parseFloat(offerte.standaard_winstmarge_perc ?? settings?.standaardWinstmarge ?? 0),
          gebruikGeenMarge: parseBool(offerte.gebruik_geen_marge),
          gebruikIndividueleMarges: parseBool(offerte.gebruik_item_marges),
          elektriciteitsprijs: elekValue,
          overrideElektriciteitsprijs: elekOverride,
          vasteStartkost: parseFloat(offerte.vaste_startkost ?? 0),
          vervoerskost: parseFloat(offerte.vervoerskost ?? 0),
          korting: parseFloat(offerte.korting_perc ?? settings?.korting ?? 0),
          btw: parseFloat(
            Number.isFinite(offerte.btw_perc) ? offerte.btw_perc : settings?.btw ?? DEFAULT_FORM.btw ?? 0
          ),
          btwVrijgesteld: Boolean(offerte.vat_exempt) || parseFloat(offerte.btw_perc ?? 0) === 0,
          btwVrijTekst: offerte.vat_exempt_reason ?? "",
          materialMarkup: settings?.materialMarkup ?? settings?.materiaalOpslagPerc ?? DEFAULT_FORM.materialMarkup,
          geldigheid_dagen: parseInt(offerte.validity_days ?? DEFAULT_FORM.geldigheid_dagen, 10),
          levertermijn: offerte.delivery_terms ?? DEFAULT_FORM.levertermijn,
          betalingsvoorwaarden: offerte.payment_terms ?? settings?.payment_terms ?? DEFAULT_FORM.betalingsvoorwaarden,
        };

        const mappedItems = (quoteItems || []).map((item) => {
          const printSeconds = Number(item.printtijd_seconden ?? 0);
          const hours = Math.floor(printSeconds / 3600);
          const minutes = Math.floor((printSeconds % 3600) / 60);
          const seconds = printSeconds % 60;

          return {
            ...INITIAL_ITEM,
            id: item.id,
            name: item.naam ?? "",
            aantal: parseNum(item.aantal ?? 1),
            hours,
            minutes,
            seconds,
            weight: parseNum(item.gewicht_g ?? 0),
            materiaal_id: item.materiaal_id ? Number(item.materiaal_id) : null,
            filamentType: item.materiaal_naam ?? "",
            filamentDisplayName: item.materiaal_naam
              ? `${item.materiaal_naam}${item.materiaal_kleur ? ` (${item.materiaal_kleur})` : ""}`
              : "",
            margin: parseNum(item.custom_winstmarge_perc ?? formFromQuote.globaleWinstmarge ?? 0),
            override_marge: parseBool(item.override_marge),
            custom_winstmarge_perc: parseNum(item.custom_winstmarge_perc ?? 0),
            supportmateriaal: parseBool(item.supportmateriaal),
            nozzle_slijtagekost: parseNum(item.nozzle_slijtagekost ?? 0),
            post_processing_kost: parseNum(item.post_processing_kost ?? 0),
            assemblage_uur: parseNum(item.assemblage_uur ?? 0),
            scan_kost: parseNum(item.scan_kost ?? 0),
            modelleringNodig: parseNum(item.modellering_uur ?? 0) > 0,
            modellering_uur: parseNum(item.modellering_uur ?? 0),
            modelleringssoftware_id: item.modelleringssoftware_id ? Number(item.modelleringssoftware_id) : null,
            gebruik_custom_uurtarief: parseBool(item.gebruik_custom_uurtarief),
            custom_uurtarief: parseNum(item.custom_uurtarief ?? 0),
            manuele_toeslag: parseNum(item.manuele_toeslag ?? 0),
            modelLink: item.model_link ?? "",
            verkoopprijs_per_stuk: parseNum(item.verkoopprijs_per_stuk ?? 0),
            subtotaal: parseNum(item.subtotaal ?? 0),
          };
        });

        const mappedCustomItems = (customQuoteItems || []).map((custom) => ({
          ...INITIAL_CUSTOM_ITEM,
          id: custom.id,
          title: custom.title ?? "",
          description: custom.description ?? "",
          quantity: parseNum(custom.quantity ?? 1),
          unit: custom.unit ?? "stuk",
          cost_amount: parseNum(custom.cost_amount ?? 0),
          price_amount: parseNum(custom.price_amount ?? 0),
          margin_percent: parseNum(custom.margin_percent ?? 0),
          vat_percent: parseNum(custom.vat_percent ?? 0),
          is_optional: parseBool(custom.is_optional),
          is_selected: parseBool(custom.is_selected ?? 1),
          group_ref: custom.group_ref ?? "",
        }));

        setForm(formFromQuote);
        setItems(mappedItems.length ? mappedItems : []);
        setCustomItems(mappedCustomItems.length ? mappedCustomItems : []);
        setQuoteMode(mappedItems.length > 0 ? "print" : "manual");
        setFormSyncKey(Date.now());
        setQuoteLoaded(true);
        setDirtyItems(false);
        setDirtyForm(false);
      } catch (error) {
        console.error("Fout bij laden offerte:", error);
        showToast({
          type: "error",
          message: error.message || "Offerte kon niet worden geladen.",
        });
        setLoadError(error.message || "Offerte kon niet worden geladen.");
        navigate("/offertes");
      } finally {
        setLoadingQuote(false);
      }
    }

    loadQuote();
  }, [editingQuoteId, isEditing, navigate, settings]);

  const summary = useMemo(() => {
    if (!settings) return null;
    return calculateQuoteCost(items, form, settings, priceRules, {
      clientId: selectedClient?.id,
      customItems,
      useStoredTotals: isEditing && !dirtyItems,
    });
  }, [items, form, settings, priceRules, selectedClient, customItems, isEditing, dirtyItems]);

  if (!settings) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Instellingen laden...</p>
        </section>
      </main>
    );
  }

  const handleAddItem = () => {
    setDirtyItems(true);
    setItems((prev) => [...prev, { ...INITIAL_ITEM }]);
  };
  const handleAddCustomItem = () => {
    setDirtyForm(true);
    setCustomItems((prev) => [...prev, { ...INITIAL_CUSTOM_ITEM }]);
  };

  const handleUpdateItem = (index, updatedItem) => {
    setDirtyItems(true);
    setItems((prev) => prev.map((item, i) => (i === index ? { ...updatedItem } : item)));
  };

  const handleUpdateCustomItem = (index, updatedItem) => {
    setDirtyForm(true);
    setCustomItems((prev) => prev.map((item, i) => (i === index ? updatedItem : item)));
  };

  const handleRemoveItem = (index) => {
    setDirtyItems(true);
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveCustomItem = (index) => {
    setDirtyForm(true);
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuote = async () => {
    if (!selectedClient) {
      showToast({ type: "warning", message: "Selecteer eerst een klant." });
      return;
    }

    if (!summary) {
      showToast({
        type: "error",
        message: "Kan offerte niet opslaan zonder berekende samenvatting.",
      });
      return;
    }

    const validationErrors = validateQuoteBeforeSave({
      items,
      customItems,
      summary,
      form,
      client: selectedClient,
      quoteMode,
      skipPrintValidation: quoteMode === "manual",
    });
    if (validationErrors.length > 0) {
      setValidationMessages(validationErrors);
      showToast({
        type: "error",
        message: `Kan offerte niet opslaan:\n- ${validationErrors.join("\n- ")}`,
        duration: 6000,
      });
      return;
    }
    setValidationMessages([]);

    const payloadItems = prepareItemsForPayload(items, summary);
    const payloadCustomItems = prepareCustomItemsForPayload(customItems);

    if (isEditing) {
      await updateExistingQuote({
        id: editingQuoteId,
        clientId: selectedClient.id,
        form,
        summary,
        items: payloadItems,
        customItems: payloadCustomItems,
        settings,
        navigate,
        showToast,
        status: quoteStatus,
      });
      return;
    }

    const payload = {
      client_id: selectedClient.id,
      form,
      items: payloadItems,
      custom_items: payloadCustomItems,
      summary,
    };

    try {
      const res = await fetch(`${baseUrl}/save-quote.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast({
          type: "success",
          message: "Offerte succesvol opgeslagen.",
        });
        navigate(`/offertes/${data.quote_id ?? ""}`);
      } else {
        throw new Error(data.error || "Onbekende fout bij opslaan.");
      }
    } catch (error) {
      console.error("Fout bij opslaan offerte:", error);
      showToast({
        type: "error",
        message: `Fout bij opslaan van offerte: ${error.message}`,
      });
    }
  };

  const headerTitle = isEditing ? `Offerte bewerken #${editingQuoteId}` : "Nieuwe offerte";
  const headerSubtitle = isEditing
    ? "Pas de offerte aan en sla de wijzigingen op."
    : "Stel parameters in, voeg printitems toe en bekijk direct de kosten.";

  const handleClientCreated = (client) => {
    if (client?.id) {
      setSelectedClient(client);
    }
    setClientRefreshKey((prev) => prev + 1);
    showToast({
      type: "success",
      message: `Klant ${client?.naam ?? ""} toegevoegd.`,
    });
  };

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Quote Console</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">{headerTitle}</h1>
          </div>
          <TerminalBackButton to="/offertes" label="Terug naar overzicht" />
        </div>
        <p className="text-sm text-gridline/70">{headerSubtitle}</p>
      </header>

      {loadingQuote ? (
        <section className="terminal-card">
          <p className="terminal-note">Bestaande offerte laden...</p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <section className="terminal-card space-y-3 bg-parchment/95">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="terminal-section-title">Workflow</p>
                  <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Print & calculatie</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="terminal-pill text-xs tracking-[0.12em]">
                    {isEditing ? `Bewerken #${editingQuoteId}` : "Nieuwe offerte"}
                  </span>
                  <span className="terminal-pill text-xs tracking-[0.12em]">{items.length} printstuk(ken)</span>
                  <span
                    className={`terminal-pill text-xs tracking-[0.12em] ${
                      summary && Number(summary?.winstPerc ?? 0) <= 0
                        ? "border-signal-red/70 text-signal-red"
                        : "text-primary"
                    }`}
                  >
                    {summary ? `Marge ${Number(summary?.winstPerc ?? 0).toFixed(1)}%` : "Nog geen marge"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gridline/75">
                Stap 1: kies klant. Stap 2: vul printstukken in. Stap 3: controleer samenvatting en sla op.
              </p>
            </section>

            <section className="terminal-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="terminal-section-title">Klantbeheer</p>
                  <h2 className="text-xl font-semibold tracking-dial uppercase">Selecteer klant</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="terminal-button is-accent text-xs tracking-[0.14em]"
                    onClick={() => setIsClientModalOpen(true)}
                  >
                    Nieuwe klant
                  </button>
                  <Link to="/instellingen/klanten" className="terminal-button is-ghost text-xs tracking-[0.14em]">
                    Klanten beheren
                  </Link>
                </div>
              </div>

              <ClientSelector selectedClient={selectedClient} setSelectedClient={setSelectedClient} refreshKey={clientRefreshKey} />

              {selectedClient ? (
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em] text-gridline/80">
                  <span className="terminal-pill">Actieve klant</span>
                  <span>
                    {selectedClient.naam}
                    {selectedClient.bedrijf ? ` / ${selectedClient.bedrijf}` : ""}
                  </span>
                  {(!selectedClient.street || !selectedClient.postal_code || !selectedClient.city || !selectedClient.country_code) && (
                    <span className="terminal-pill border-signal-amber/70 text-signal-amber">
                      Vul straat / postcode / stad / land in (nodig voor factuur/UBL)
                    </span>
                  )}
                </div>
              ) : (
                <p className="terminal-note">Geen klant geselecteerd.</p>
              )}
            </section>

            <QuoteForm
              onChange={(updated, meta = {}) => {
                if (meta.user) {
                  setDirtyForm(true);
                }
                setForm(updated);
              }}
              initialValues={form}
              syncKey={formSyncKey}
            />

            {quoteMode === "print" && (
              <PrintItemList
                printItems={items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
              />
            )}

            <CustomItemList
              items={customItems}
              onAddItem={handleAddCustomItem}
              onUpdateItem={handleUpdateCustomItem}
              onRemoveItem={handleRemoveCustomItem}
            />
          </div>

          <div className="space-y-4 xl:sticky xl:top-4">
            <SummarySection summary={summary} />

            {summary && Number(summary?.totals?.total_final ?? 0) === 0 && (
              <div className="terminal-card border border-dashed border-signal-amber/50 text-signal-amber bg-parchment/80">
                <p className="text-sm tracking-[0.08em]">
                  Totale offertewaarde is EUR 0.00. Controleer printtijd, gewicht of materiaalkeuze.
                </p>
              </div>
            )}
            {summary && Number(summary?.winstPerc ?? 0) <= 0 && (
              <div className="terminal-card border border-signal-red/60 text-signal-red bg-base-highlight/10">
                <p className="text-sm tracking-[0.08em] font-semibold">Waarschuwing: marge is negatief of nul.</p>
                <p className="text-xs text-gridline/80">Pas prijzen of kosten aan voordat je verstuurt.</p>
              </div>
            )}
            {summary && Number(summary?.winstPerc ?? 0) > 0 && Number(summary?.winstPerc ?? 0) < 5 && (
              <div className="terminal-card border border-signal-amber/60 text-signal-amber bg-base-highlight/10">
                <p className="text-sm tracking-[0.08em] font-semibold">Lage marge: {Number(summary.winstPerc).toFixed(1)}%</p>
                <p className="text-xs text-gridline/80">Overweeg aanpassing voor gezonde marge.</p>
              </div>
            )}

          <div className="terminal-card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="terminal-section-title mb-0">Opslaan</p>
              {!selectedClient && (
                <span className="terminal-pill text-xs tracking-[0.12em] text-gridline/70">
                  Selecteer klant eerst
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-xs text-gridline/70">
                <p>Controleren klaar? Sla op als concept of definitief door de offerte te openen na opslaan.</p>
                {validationMessages.length > 0 && (
                  <ul className="text-signal-red space-y-1">
                    {validationMessages.map((msg, idx) => (
                      <li key={idx}>• {msg}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveQuote}
                className="terminal-button is-accent disabled:opacity-60"
                disabled={!selectedClient}
                >
                  {isEditing ? "Offerte bijwerken" : "Offerte opslaan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ClientAddModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleClientCreated}
      />
    </main>
  );
}

function prepareItemsForPayload(items, summary) {
  const itemSummaries = summary?.itemResultaten ?? [];

  if (!Array.isArray(items) || items.length === 0) return [];

  return items.map((item, index) => {
    const kost = itemSummaries[index]?.kost;

    return {
      ...item,
      hours: Number(item.hours ?? 0),
      minutes: Number(item.minutes ?? 0),
      seconds: Number(item.seconds ?? 0),
      aantal: Number(item.aantal ?? 1),
      weight: Number(item.weight ?? 0),
      materiaal_id: item.materiaal_id ? Number(item.materiaal_id) : null,
      supportmateriaal: Boolean(item.supportmateriaal),
      nozzle_slijtagekost: Number(item.nozzle_slijtagekost ?? 0),
      post_processing_kost: Number(item.post_processing_kost ?? 0),
      assemblage_uur: Number(item.assemblage_uur ?? 0),
      scan_kost: Number(item.scan_kost ?? 0),
      modellering_uur: Number(item.modellering_uur ?? 0),
      modelleringssoftware_id: item.modelleringssoftware_id ? Number(item.modelleringssoftware_id) : null,
      gebruik_custom_uurtarief: Boolean(item.gebruik_custom_uurtarief),
      custom_uurtarief: Number(item.custom_uurtarief ?? 0),
      override_marge: Boolean(item.override_marge),
      custom_winstmarge_perc: Number(item.custom_winstmarge_perc ?? item.margin ?? 0),
      manuele_toeslag: Number(item.manuele_toeslag ?? 0),
      model_link: item.modelLink || item.model_link || null,
      verkoopprijs_per_stuk: kost
        ? Number(kost.verkoopprijs_per_stuk ?? kost.quote?.per_print?.cost_with_margin ?? 0)
        : Number(item.verkoopprijs_per_stuk ?? 0),
      subtotaal: kost
        ? Number(kost.subtotaal ?? kost.quote?.totals?.subtotal ?? 0)
        : Number(item.subtotaal ?? 0),
    };
  });
}

function validateQuoteBeforeSave({ items, customItems, summary, form, client, quoteMode, skipPrintValidation = false }) {
  const errors = [];

  if (!form?.offertedatum) {
    errors.push("Offertedatum ontbreekt.");
  }

  const hasPrintItems = Array.isArray(items) && items.length > 0;
  const hasCustomItems = Array.isArray(customItems) && customItems.length > 0;

  if (!hasPrintItems && !hasCustomItems) {
    errors.push("Voeg minstens één print- of customregel toe.");
  }

  if (!skipPrintValidation && quoteMode !== "manual" && hasPrintItems) {
    (items || []).forEach((item, index) => {
      const label = `Printstuk ${String(index + 1).padStart(2, "0")}`;
      const weight = Number(item.weight ?? 0);
      const seconds =
        Number(item.hours ?? 0) * 3600 +
        Number(item.minutes ?? 0) * 60 +
        Number(item.seconds ?? 0);

      if (!item.materiaal_id) {
        errors.push(`${label}: selecteer een materiaal.`);
      }

      if (!weight || weight <= 0) {
        errors.push(`${label}: gewicht moet groter dan 0 gram zijn.`);
      }

      if (!seconds || seconds <= 0) {
        errors.push(`${label}: vul de printtijd in (uren/minuten/seconden).`);
      }
    });
  }

  (customItems || []).forEach((custom, index) => {
    const label = `Custom regel ${String(index + 1).padStart(2, "0")}`;
    if (!custom.title || String(custom.title).trim() === "") {
      errors.push(`${label}: titel ontbreekt.`);
    }
    if (Number(custom.price_amount ?? 0) < 0) {
      errors.push(`${label}: verkoopprijs mag niet negatief zijn.`);
    }
    if (Number(custom.quantity ?? 0) <= 0) {
      errors.push(`${label}: hoeveelheid moet groter dan 0 zijn.`);
    }
  });

  const faultyItems =
    summary?.itemResultaten?.filter((entry) => entry?.kost?.fout) ?? [];
  if (faultyItems.length > 0) {
    errors.push("Lossen eerst de fouten in de kostencalculatie op.");
  }

  const totalFinal = Number(summary?.totals?.total_final ?? 0);
  const marginPerc = Number(summary?.winstPerc ?? 0);
  if (totalFinal <= 0) {
    errors.push("Totale offertewaarde moet groter dan 0 zijn.");
  }
  if (marginPerc <= 0) {
    errors.push("Marge is negatief of nul; controleer prijzen.");
  }

  if (client) {
    const requiredAddress = ["street", "postal_code", "city", "country_code"];
    const missingAddr = requiredAddress.filter((key) => !client[key] || String(client[key]).trim() === "");
    if (missingAddr.length > 0) {
      errors.push("Klantadres onvolledig (straat/postcode/stad/land verplicht voor factuur/UBL).");
    }
  }

  return errors;
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

async function updateExistingQuote({ id, clientId, form, summary, items, customItems, settings, navigate, showToast, status }) {
  const totals = summary?.totals ?? {};
  const notify = typeof showToast === "function" ? showToast : () => {};

  const payload = {
    id: Number(id),
    client_id: clientId,
    datum: form.offertedatum,
    standaard_winstmarge_perc: Number(form.globaleWinstmarge ?? 0),
    gebruik_geen_marge: form.gebruikGeenMarge,
    gebruik_item_marges: form.gebruikIndividueleMarges,
    vaste_startkost: Number(form.vasteStartkost ?? 0),
    vervoerskost: Number(form.vervoerskost ?? 0),
    korting_perc: Number(form.korting ?? 0),
    btw_perc: Number(form.btw ?? 0),
    elektriciteitskost_per_kwh: form.overrideElektriciteitsprijs
      ? Number(form.elektriciteitsprijs ?? 0)
      : Number(settings?.elektriciteitsprijs ?? 0),
    validity_days: Number(form.geldigheid_dagen ?? 30),
    delivery_terms: form.levertermijn ?? "",
    payment_terms: form.betalingsvoorwaarden ?? "",
    quote_number: form.offertenummer || form.quote_number || null,
    totaal_netto: Number(totals.total_final ?? totals.subtotal ?? 0),
    totaal_btw: Number(totals.vat_amount ?? 0),
    totaal_bruto: Number(totals.total_including_vat ?? totals.total_final ?? 0),
    opmerkingen: "",
    vat_exempt: Boolean(form.btwVrijgesteld),
    vat_exempt_reason: form.btwVrijTekst ?? "",
    status: status ?? "draft",
    items,
    custom_items: customItems,
  };

  try {
    const res = await fetch(`${baseUrl}/update-quote.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Bijwerken mislukt.");
    }

    notify({
      type: "success",
      message: `Offerte #${id} succesvol bijgewerkt.`,
    });
    navigate(`/offertes/${id}`);
  } catch (error) {
    console.error("Fout bij bijwerken offerte:", error);
    notify({
      type: "error",
      message: error?.message || "Er ging iets mis bij het bijwerken van de offerte.",
    });
  }
}


