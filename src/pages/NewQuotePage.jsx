import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import QuoteForm from "../components/QuoteForm";
import PrintItemList from "../components/PrintItemList";
import SummarySection from "../components/SummarySection";
import calculateQuoteCost from "../lib/calculateQuoteCost";
import { SettingsContext } from "../context/SettingsContext";
import ClientSelector from "../components/ClientSelector";
import TerminalBackButton from "../components/TerminalBackButton";

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

const DEFAULT_FORM = {
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
  btw: 21,
};

export default function NewQuotePage() {
  const { settings } = useContext(SettingsContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingQuoteId = searchParams.get("edit");
  const isEditing = Boolean(editingQuoteId);

  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [items, setItems] = useState([INITIAL_ITEM]);
  const [summary, setSummary] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteLoaded, setQuoteLoaded] = useState(false);

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
        btw: settings.btw ?? prev.btw,
      };
    });
  }, [settings, isEditing, quoteLoaded]);

  useEffect(() => {
    if (!isEditing || !editingQuoteId) {
      setQuoteLoaded(false);
      return;
    }

    async function loadQuote() {
      try {
        setLoadingQuote(true);
        const response = await fetch(`/api/get-quote-detail.php?id=${editingQuoteId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Offerte kon niet geladen worden.");
        }
        const data = await response.json();
        if (data?.error) {
          throw new Error(data.error);
        }

        const { offerte, items: quoteItems } = data;

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

        const formFromQuote = {
          ...DEFAULT_FORM,
          offertedatum: offerte.datum ?? DEFAULT_FORM.offertedatum,
          globaleWinstmarge: parseFloat(offerte.standaard_winstmarge_perc ?? settings?.standaardWinstmarge ?? 0),
          gebruikGeenMarge: Boolean(offerte.gebruik_geen_marge),
          gebruikIndividueleMarges: Boolean(offerte.gebruik_item_marges),
          elektriciteitsprijs: parseFloat(offerte.elektriciteitskost_per_kwh ?? settings?.elektriciteitsprijs ?? 0),
          overrideElektriciteitsprijs: true,
          vasteStartkost: parseFloat(offerte.vaste_startkost ?? 0),
          vervoerskost: parseFloat(offerte.vervoerskost ?? 0),
          korting: parseFloat(offerte.korting_perc ?? settings?.korting ?? 0),
          btw: parseFloat(offerte.btw_perc ?? settings?.btw ?? 21),
          materialMarkup: settings?.materialMarkup ?? settings?.materiaalOpslagPerc ?? DEFAULT_FORM.materialMarkup,
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
            aantal: Number(item.aantal ?? 1),
            hours,
            minutes,
            seconds,
            weight: Number(item.gewicht_g ?? 0),
            materiaal_id: item.materiaal_id ? Number(item.materiaal_id) : null,
            filamentType: item.materiaal_naam ?? "",
            filamentDisplayName: item.materiaal_naam
              ? `${item.materiaal_naam}${item.materiaal_kleur ? ` (${item.materiaal_kleur})` : ""}`
              : "",
            margin: Number(item.custom_winstmarge_perc ?? formFromQuote.globaleWinstmarge ?? 0),
            override_marge: Boolean(item.override_marge),
            custom_winstmarge_perc: Number(item.custom_winstmarge_perc ?? 0),
            supportmateriaal: Boolean(item.supportmateriaal),
            nozzle_slijtagekost: Number(item.nozzle_slijtagekost ?? 0),
            post_processing_kost: Number(item.post_processing_kost ?? 0),
            assemblage_uur: Number(item.assemblage_uur ?? 0),
            scan_kost: Number(item.scan_kost ?? 0),
            modelleringNodig: Number(item.modellering_uur ?? 0) > 0,
            modellering_uur: Number(item.modellering_uur ?? 0),
            modelleringssoftware_id: item.modelleringssoftware_id ? Number(item.modelleringssoftware_id) : null,
            gebruik_custom_uurtarief: Boolean(item.gebruik_custom_uurtarief),
            custom_uurtarief: Number(item.custom_uurtarief ?? 0),
            manuele_toeslag: Number(item.manuele_toeslag ?? 0),
            modelLink: item.model_link ?? "",
            verkoopprijs_per_stuk: Number(item.verkoopprijs_per_stuk ?? 0),
            subtotaal: Number(item.subtotaal ?? 0),
          };
        });

        setForm(formFromQuote);
        setItems(mappedItems.length ? mappedItems : [INITIAL_ITEM]);
        setQuoteLoaded(true);
      } catch (error) {
        console.error("Fout bij laden offerte:", error);
        alert(error.message || "Offerte kon niet worden geladen.");
        navigate("/offertes");
      } finally {
        setLoadingQuote(false);
      }
    }

    loadQuote();
  }, [editingQuoteId, isEditing, navigate, settings]);

  useEffect(() => {
    if (!settings) {
      setSummary(null);
      return;
    }
    const calculated = calculateQuoteCost(items, form, settings);
    setSummary(calculated);
  }, [items, form, settings]);

  if (!settings) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Instellingen laden…</p>
        </section>
      </main>
    );
  }

  const handleAddItem = () => setItems((prev) => [...prev, { ...INITIAL_ITEM }]);

  const handleUpdateItem = (index, updatedItem) => {
    setItems((prev) => prev.map((item, i) => (i === index ? updatedItem : item)));
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuote = async () => {
    if (!selectedClient) {
      alert("Selecteer eerst een klant.");
      return;
    }

    if (!summary) {
      alert("Kan offerte niet opslaan zonder berekende samenvatting.");
      return;
    }

    const payloadItems = prepareItemsForPayload(items, summary);

    if (isEditing) {
      await updateExistingQuote({
        id: editingQuoteId,
        clientId: selectedClient.id,
        form,
        summary,
        items: payloadItems,
        settings,
        navigate,
      });
      return;
    }

    const payload = {
      client_id: selectedClient.id,
      form,
      items,
      summary,
    };

    try {
      const res = await fetch("/api/save-quote.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Offerte succesvol opgeslagen!");
        navigate(`/offertes/${data.quote_id ?? ""}`);
      } else {
        throw new Error(data.error || "Onbekende fout bij opslaan.");
      }
    } catch (error) {
      console.error("Fout bij opslaan offerte:", error);
      alert("Fout bij opslaan van offerte: " + error.message);
    }
  };

  const headerTitle = isEditing ? `Offerte bewerken #${editingQuoteId}` : "Nieuwe offerte";
  const headerSubtitle = isEditing
    ? "Pas de offerte aan en sla de wijzigingen op."
    : "Stel parameters in, voeg printitems toe en bekijk direct de kosten.";

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
          <p className="terminal-note">Bestande offerte laden…</p>
        </section>
      ) : (
        <>
          <section className="terminal-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="terminal-section-title">Klantbeheer</p>
                <h2 className="text-xl font-semibold tracking-dial uppercase">
                  Selecteer klant
                </h2>
              </div>
              <Link
                to="/instellingen/klanten"
                className="terminal-button is-ghost text-xs tracking-[0.14em]"
              >
                Nieuwe klant
              </Link>
            </div>

            <ClientSelector
              selectedClient={selectedClient}
              setSelectedClient={setSelectedClient}
            />

            {selectedClient ? (
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em] text-gridline/80">
                <span className="terminal-pill">Actieve klant</span>
                <span>
                  {selectedClient.naam}
                  {selectedClient.bedrijf ? ` / ${selectedClient.bedrijf}` : ""}
                </span>
              </div>
            ) : (
              <p className="terminal-note">Geen klant geselecteerd.</p>
            )}
          </section>

          <QuoteForm onChange={setForm} />

          <PrintItemList
            printItems={items}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />

          <SummarySection summary={summary} />

          {summary && Number(summary?.totals?.total_final ?? 0) === 0 && (
            <div className="terminal-card border border-dashed border-signal-amber/50 text-signal-amber bg-parchment/80">
              <p className="text-sm tracking-[0.08em]">
                Totale offertewaarde is EUR 0.00. Controleer printtijd, gewicht of materiaalkeuze.
              </p>
            </div>
          )}

          {selectedClient && (
            <div className="flex justify-end">
              <button onClick={handleSaveQuote} className="terminal-button is-accent">
                {isEditing ? "Offerte bijwerken" : "Offerte opslaan"}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function prepareItemsForPayload(items, summary) {
  const itemSummaries = summary?.itemResultaten ?? [];

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

async function updateExistingQuote({ id, clientId, form, summary, items, settings, navigate }) {
  const totals = summary?.totals ?? {};

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
    totaal_netto: Number(totals.prints_total ?? 0),
    totaal_btw: Number(totals.vat_amount ?? 0),
    totaal_bruto: Number(totals.total_including_vat ?? totals.total_final ?? 0),
    opmerkingen: "",
    items,
  };

  try {
    const res = await fetch("/api/update-quote.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Bijwerken mislukt.");
    }

    alert(`Offerte #${id} succesvol bijgewerkt.`);
    navigate(`/offertes/${id}`);
  } catch (error) {
    console.error("Fout bij bijwerken offerte:", error);
    alert(error?.message || "Er ging iets mis bij het bijwerken van de offerte.");
  }
}
