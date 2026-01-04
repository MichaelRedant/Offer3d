
import { useEffect, useMemo, useState } from "react";
import TerminalBackButton from "../TerminalBackButton";
import { baseUrl } from "../../lib/constants";

const EMPTY_FORM = {
  id: null,
  naam: "",
  type: "",
  kleur: "",
  prijs_per_kg: "",
  moet_drogen: false,
  supportmateriaal: false,
  manufacturer_id: "",
  stock_rollen: 0,
  winstmarge_perc: 0,
  batch_code: "",
  vervaldatum: "",
  droger_status: "nvt",
  bestel_url: "",
};

const EMPTY_MANUFACTURER = { naam: "", land: "", website: "" };

const EMPTY_SPOOL = {
  id: null,
  material_id: "",
  label: "",
  status: "sealed",
  locatie: "",
  gewicht_netto_gram: 1000,
  gewicht_rest_gram: "",
  batch_code: "",
  aankoop_datum: "",
  notities: "",
};

const COLOR_SWATCHES = [
  { label: "Zwart", value: "#111827" },
  { label: "Wit", value: "#f8fafc" },
  { label: "Grijs", value: "#9ca3af" },
  { label: "Blauw", value: "#2563eb" },
  { label: "Rood", value: "#ef4444" },
  { label: "Groen", value: "#16a34a" },
  { label: "Geel", value: "#f59e0b" },
  { label: "Oranje", value: "#f97316" },
  { label: "Paars", value: "#7c3aed" },
  { label: "Transparant", value: "transparant" },
];
export default function MaterialManager() {
  const [materials, setMaterials] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [manufacturerForm, setManufacturerForm] = useState(EMPTY_MANUFACTURER);
  const [savingManufacturer, setSavingManufacturer] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [spools, setSpools] = useState([]);
  const [spoolFilterMaterial, setSpoolFilterMaterial] = useState("");
  const [spoolFilterStatus, setSpoolFilterStatus] = useState("");
  const [spoolForm, setSpoolForm] = useState(EMPTY_SPOOL);
  const [isEditingSpool, setIsEditingSpool] = useState(false);
  const [showSpoolModal, setShowSpoolModal] = useState(false);
  const [savingSpool, setSavingSpool] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchManufacturers();
    fetchSpools();
  }, []);

  const filteredMaterials = useMemo(() => {
    const term = filterSearch.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesManufacturer = filterManufacturer
        ? String(material.manufacturer_id) === String(filterManufacturer)
        : true;
      const matchesType = filterType ? (material.type || "").toLowerCase() === filterType : true;
      const matchesColor = filterColor ? (material.kleur || "").toLowerCase() === filterColor : true;
      const matchesTerm = term
        ? [material.naam, material.type, material.kleur, material.manufacturer]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(term))
        : true;
      return matchesManufacturer && matchesType && matchesColor && matchesTerm;
    });
  }, [materials, filterManufacturer, filterType, filterColor, filterSearch]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(
      materials
        .map((m) => (m.type || "").trim())
        .filter(Boolean)
        .map((v) => v.toLowerCase())
    );
    return Array.from(set);
  }, [materials]);

  const uniqueColors = useMemo(() => {
    const set = new Set(
      materials
        .map((m) => (m.kleur || "").trim())
        .filter(Boolean)
        .map((v) => v.toLowerCase())
    );
    return Array.from(set);
  }, [materials]);

  const filteredSpools = useMemo(
    () =>
      spools.filter((spool) => {
        const matchesMaterial = spoolFilterMaterial
          ? String(spool.material_id) === String(spoolFilterMaterial)
          : true;
        const matchesStatus = spoolFilterStatus ? spool.status === spoolFilterStatus : true;
        return matchesMaterial && matchesStatus;
      }),
    [spools, spoolFilterMaterial, spoolFilterStatus]
  );

  const materialById = useMemo(() => {
    const map = {};
    materials.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [materials]);

  const materialStats = useMemo(() => {
    const total = materials.length;
    const drying = materials.filter((material) => material.moet_drogen).length;
    const lowStock = materials.filter((material) => {
      if (material.voorraad_gram_rest !== null && material.voorraad_gram_rest !== undefined) {
        return Number(material.voorraad_gram_rest) <= 250;
      }
      return Number(material.stock_rollen ?? 0) <= 1;
    }).length;
    const avgMargin =
      total === 0
        ? 0
        : materials.reduce((sum, material) => sum + Number(material.winstmarge_perc ?? 0), 0) / total;

    return [
      { label: "Totaal materialen", value: total, description: "Beschikbaar in de bibliotheek" },
      { label: "Droging vereist", value: drying, description: "Materiaaltypes met droogvereiste" },
      { label: "Lage voorraad", value: lowStock, description: "Rollen met voorraad = 1" },
      { label: "Gem. winstmarge", value: `${avgMargin.toFixed(1)}%`, description: "Op materiaalspecificaties" },
    ];
  }, [materials]);

  const spoolStats = useMemo(() => {
    const total = spools.length;
    const restGram = spools.reduce((sum, spool) => {
      const rest = spool.gewicht_rest_gram ?? spool.gewicht_netto_gram ?? 0;
      return sum + Number(rest);
    }, 0);

    const counts = spools.reduce(
      (acc, spool) => {
        if (spool.status === "open") acc.open += 1;
        if (spool.status === "sealed") acc.sealed += 1;
        if (spool.status === "reserve") acc.reserve += 1;
        if (spool.status === "empty") acc.empty += 1;
        const rest = spool.gewicht_rest_gram ?? spool.gewicht_netto_gram ?? 0;
        if (rest > 0 && rest <= 250) acc.low += 1;
        return acc;
      },
      { open: 0, sealed: 0, reserve: 0, empty: 0, low: 0 }
    );

    return { total, restKg: restGram / 1000, ...counts };
  }, [spools]);

  const spoolStatCards = [
    { label: "Rollen in voorraad", value: spoolStats.total, description: "Actief geteld in beheer" },
    { label: "Beschikbaar gewicht", value: `${spoolStats.restKg.toFixed(2)} kg`, description: "Gebaseerd op restgewicht" },
    { label: "Open rollen", value: spoolStats.open, description: `${spoolStats.low} bijna leeg` },
    { label: "Reserve / leeg", value: `${spoolStats.reserve} / ${spoolStats.empty}`, description: "Reserve en lege hulzen" },
  ];
  function showFeedback(message, tone = "info") {
    setFeedback({ message, tone });
    setTimeout(() => setFeedback(null), 3800);
  }

  async function fetchMaterials() {
    try {
      const response = await fetch(`${baseUrl}/get-materials.php`);
      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij laden materialen:", error);
      showFeedback("Materialen konden niet worden geladen.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchManufacturers() {
    try {
      const response = await fetch(`${baseUrl}/get-manufacturers.php`);
      const data = await response.json();
      setManufacturers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij ophalen fabrikanten:", error);
      showFeedback("Fabrikanten konden niet worden geladen.", "error");
    }
  }

  async function fetchSpools() {
    try {
      const response = await fetch(`${baseUrl}/get-spools.php`);
      const data = await response.json();
      setSpools(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fout bij ophalen rollen:", error);
      showFeedback("Rolvoorraad kon niet geladen worden.", "error");
    }
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleColorChange = (kleur) => {
    setForm((prev) => ({ ...prev, kleur }));
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setShowMaterialModal(false);
  };

  const openNewMaterial = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setShowMaterialModal(true);
  };

  const handleEdit = (material) => {
    setForm({
      id: material.id,
      naam: material.naam ?? "",
      type: material.type ?? "",
      kleur: material.kleur ?? "",
      prijs_per_kg: material.prijs_per_kg ?? "",
      moet_drogen: Boolean(material.moet_drogen),
      supportmateriaal: Boolean(material.supportmateriaal),
      manufacturer_id: material.manufacturer_id ?? "",
      stock_rollen: material.stock_rollen ?? 0,
      winstmarge_perc: material.winstmarge_perc ?? 0,
      batch_code: material.batch_code ?? "",
      vervaldatum: material.vervaldatum ?? "",
      droger_status: material.droger_status ?? "nvt",
      bestel_url: material.bestel_url ?? "",
    });
    setIsEditing(true);
    setShowMaterialModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Weet je zeker dat je dit materiaal wilt verwijderen?")) return;

    try {
      const response = await fetch(`${baseUrl}/delete-material.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (!response.ok || result.error || result.success === false) {
        throw new Error(result.error || "Verwijderen mislukt");
      }

      setMaterials((prev) => prev.filter((material) => material.id !== id));
      showFeedback("Materiaal verwijderd.", "success");
    } catch (error) {
      console.error("Fout bij verwijderen materiaal:", error);
      showFeedback(error.message, "error");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const endpoint = form.id ? "update-material.php" : "save-material.php";
    const payload = {
      ...form,
      prijs_per_kg: Number(form.prijs_per_kg) || 0,
      winstmarge_perc: Number(form.winstmarge_perc) || 0,
      stock_rollen: Number(form.stock_rollen) || 0,
      manufacturer_id: form.manufacturer_id || null,
      bestel_url: form.bestel_url?.trim() || "",
    };

    try {
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result.error || result.success === false) {
        throw new Error(result.error || "Opslaan mislukt");
      }

      if (form.id) {
        setMaterials((prev) => prev.map((material) => (material.id === form.id ? { ...material, ...payload } : material)));
      } else if (result.material) {
        setMaterials((prev) => [result.material, ...prev]);
      } else {
        fetchMaterials();
      }

      showFeedback(form.id ? "Materiaal bijgewerkt." : "Materiaal toegevoegd.", "success");
      handleReset();
    } catch (error) {
      console.error("Fout bij opslaan materiaal:", error);
      showFeedback(error.message, "error");
    }
  };
  const handleManufacturerChange = (event) => {
    const { name, value } = event.target;
    setManufacturerForm((prev) => ({ ...prev, [name]: value }));
  };

  const openNewManufacturer = () => {
    setManufacturerForm(EMPTY_MANUFACTURER);
    setShowManufacturerModal(true);
  };

  const saveManufacturer = async (event) => {
    event.preventDefault();
    setSavingManufacturer(true);
    try {
      const response = await fetch(`${baseUrl}/add-manufacturer.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manufacturerForm),
      });
      const result = await response.json();

      if (!response.ok || result.error || result.success === false) {
        throw new Error(result.error || "Fabrikant opslaan mislukt");
      }

      showFeedback("Fabrikant toegevoegd.", "success");
      setShowManufacturerModal(false);
      setManufacturerForm(EMPTY_MANUFACTURER);
      fetchManufacturers();
    } catch (error) {
      console.error("Fout bij opslaan fabrikant:", error);
      showFeedback(error.message, "error");
    } finally {
      setSavingManufacturer(false);
    }
  };

  const handleSpoolChange = (event) => {
    const { name, value } = event.target;
    setSpoolForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpoolReset = () => {
    setSpoolForm(EMPTY_SPOOL);
    setIsEditingSpool(false);
    setShowSpoolModal(false);
  };

  const handleSpoolEdit = (spool) => {
    setSpoolForm({
      id: spool.id,
      material_id: spool.material_id ?? "",
      label: spool.label ?? "",
      status: spool.status ?? "sealed",
      locatie: spool.locatie ?? "",
      gewicht_netto_gram: spool.gewicht_netto_gram ?? 1000,
      gewicht_rest_gram: spool.gewicht_rest_gram ?? spool.gewicht_netto_gram ?? "",
      batch_code: spool.batch_code ?? "",
      aankoop_datum: spool.aankoop_datum ?? "",
      notities: spool.notities ?? "",
    });
    setIsEditingSpool(true);
    setShowSpoolModal(true);
  };

  const handleSpoolDelete = async (id) => {
    if (!confirm("Weet je zeker dat je deze rol wilt verwijderen?")) return;
    try {
      const response = await fetch(`${baseUrl}/delete-spool.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (!response.ok || result.error || result.success === false) {
        throw new Error(result.error || "Verwijderen mislukt");
      }

      setSpools((prev) => prev.filter((spool) => spool.id !== id));
      showFeedback("Rol verwijderd.", "success");
    } catch (error) {
      console.error("Fout bij verwijderen rol:", error);
      showFeedback(error.message, "error");
    }
  };

  const handleSpoolSave = async (event) => {
    event.preventDefault();
    setSavingSpool(true);

    const endpoint = spoolForm.id ? "update-spool.php" : "save-spool.php";
    const payload = {
      ...spoolForm,
      material_id: Number(spoolForm.material_id) || "",
      gewicht_netto_gram: Number(spoolForm.gewicht_netto_gram) || 0,
      gewicht_rest_gram:
        spoolForm.gewicht_rest_gram === "" || spoolForm.gewicht_rest_gram === null
          ? ""
          : Number(spoolForm.gewicht_rest_gram) || 0,
    };

    try {
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result.error || result.success === false) {
        throw new Error(result.error || "Rol opslaan mislukt");
      }

      if (spoolForm.id) {
        setSpools((prev) =>
          prev.map((spool) => {
            if (spool.id !== spoolForm.id) return spool;
            const material = materialById[payload.material_id];
            return {
              ...spool,
              ...payload,
              material_name: material?.naam ?? spool.material_name,
              material_type: material?.type ?? spool.material_type,
              material_kleur: material?.kleur ?? spool.material_kleur,
              manufacturer: material?.manufacturer ?? spool.manufacturer,
            };
          })
        );
      } else if (result.spool) {
        const material = materialById[result.spool.material_id];
        const enriched = {
          ...result.spool,
          material_name: material?.naam ?? "Onbekend materiaal",
          material_type: material?.type ?? "Type onbekend",
          material_kleur: material?.kleur ?? "#d1d5db",
          manufacturer: material?.manufacturer ?? null,
        };
        setSpools((prev) => [enriched, ...prev]);
      } else {
        fetchSpools();
      }

      showFeedback(spoolForm.id ? "Rol bijgewerkt." : "Rol toegevoegd.", "success");
      handleSpoolReset();
    } catch (error) {
      console.error("Fout bij opslaan rol:", error);
      showFeedback(error.message, "error");
    } finally {
      setSavingSpool(false);
    }
  };

  const openNewSpool = () => {
    setSpoolForm(EMPTY_SPOOL);
    setIsEditingSpool(false);
    setShowSpoolModal(true);
  };
  return (
    <section className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan sticky top-4 z-10 bg-terminal/90 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Filament & materialen</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase">Materialen beheren</h1>
          </div>
          <TerminalBackButton label="Terug naar dashboard" to="/dashboard" />
        </div>
        <p className="text-sm text-gridline/80">
          Een plaats voor materiaaltypes, fabrikanten en rollen. Voer kleuren, droogstatus en voorraad bij.
        </p>
      </header>

      {feedback && <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />}

      <section className="terminal-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold uppercase tracking-dial text-base-soft">Kerncijfers</h2>
          <div className="flex gap-2">
            <button className="terminal-button is-ghost" onClick={fetchMaterials}>
              Herladen materialen
            </button>
            <button className="terminal-button is-ghost" onClick={fetchSpools}>
              Herladen rollen
            </button>
          </div>
        </div>
        <div className="terminal-grid md:grid-cols-4">
          {materialStats.map((item) => (
            <div key={item.label} className="stat-card">
              <p className="stat-label">{item.label}</p>
              <p className="stat-value">{item.value}</p>
              <p className="stat-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="terminal-section-title">Bibliotheek</p>
            <h3 className="text-2xl font-semibold uppercase tracking-dial text-base-soft">Materialen</h3>
          </div>
          <div className="flex gap-2">
            <button className="terminal-button is-ghost" onClick={openNewManufacturer}>
              Nieuwe fabrikant
            </button>
            <button className="terminal-button is-accent" onClick={openNewMaterial}>
              Nieuw materiaal
            </button>
          </div>
        </div>

        <div className="terminal-grid md:grid-cols-4 gap-3">
          <InputField
            label="Zoeken"
            name="zoek"
            placeholder="Naam, type, kleur"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <div className="space-y-2">
            <label className="terminal-label">Type</label>
            <select
              className="terminal-input"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Alle types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="terminal-label">Kleur</label>
            <select
              className="terminal-input"
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
            >
              <option value="">Alle kleuren</option>
              {uniqueColors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="terminal-label">Fabrikant</label>
            <select
              className="terminal-input"
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
            >
              <option value="">Alle fabrikanten</option>
              {manufacturers.map((man) => (
                <option key={man.id} value={man.id}>
                  {man.naam}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="terminal-note">Materialen laden...</p>
        ) : filteredMaterials.length === 0 ? (
          <p className="terminal-note">Geen materialen gevonden.</p>
        ) : (
          <div className="terminal-grid md:grid-cols-2 xl:grid-cols-3">
            {filteredMaterials.map((material) => (
              <article key={material.id} className="terminal-panel space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-gridline/70">{material.type || "Onbekend type"}</p>
                    <h4 className="text-lg font-semibold text-base-soft">{material.naam}</h4>
                    <p className="text-sm text-gridline/80 flex items-center gap-2">
                      <span className="inline-flex h-4 w-4 rounded-full border border-gridline/30" style={{ background: material.kleur || "#d1d5db" }} />
                      {material.kleur || "kleur onbekend"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gridline/70 space-y-1">
                    <p>€ {Number(material.prijs_per_kg ?? 0).toFixed(2)}/kg</p>
                    <p>Winstmarge: {Number(material.winstmarge_perc ?? 0).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gridline/80">
                  <p>Fabrikant: {material.manufacturer || "-"}</p>
                  <p>Voorraad: {material.stock_rollen ?? 0} rollen</p>
                  <p>Droging: {material.moet_drogen ? "Ja" : "Nee"}</p>
                  <p>Support: {material.supportmateriaal ? "Ja" : "Nee"}</p>
                </div>

                {material.bestel_url && (
                  <a
                    className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-100 transition"
                    href={material.bestel_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Bestellen ↗
                  </a>
                )}

                <div className="flex flex-wrap gap-2">
                  <button className="terminal-button is-ghost text-xs" onClick={() => handleEdit(material)}>
                    Wijzig
                  </button>
                  <button className="terminal-button is-danger text-xs" onClick={() => handleDelete(material.id)}>
                    Verwijder
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="terminal-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="terminal-section-title">Rolbeheer</p>
            <h3 className="text-2xl font-semibold uppercase tracking-dial text-base-soft">Filamentrollen</h3>
          </div>
          <div className="flex gap-2">
            <select
              className="terminal-input w-48"
              value={spoolFilterMaterial}
              onChange={(e) => setSpoolFilterMaterial(e.target.value)}
            >
              <option value="">Alle materialen</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.naam}
                </option>
              ))}
            </select>
            <select
              className="terminal-input w-40"
              value={spoolFilterStatus}
              onChange={(e) => setSpoolFilterStatus(e.target.value)}
            >
              <option value="">Alle status</option>
              <option value="sealed">Sealed</option>
              <option value="open">Open</option>
              <option value="reserve">Reserve</option>
              <option value="empty">Leeg</option>
            </select>
            <button className="terminal-button is-accent" onClick={openNewSpool}>
              Nieuwe rol
            </button>
          </div>
        </div>

        <div className="terminal-grid md:grid-cols-4">
          {spoolStatCards.map((item) => (
            <div key={item.label} className="stat-card">
              <p className="stat-label">{item.label}</p>
              <p className="stat-value">{item.value}</p>
              <p className="stat-desc">{item.description}</p>
            </div>
          ))}
        </div>

        {filteredSpools.length === 0 ? (
          <p className="terminal-note">Geen rollen beschikbaar.</p>
        ) : (
          <div className="terminal-grid md:grid-cols-2 xl:grid-cols-3">
            {filteredSpools.map((spool) => (
              <SpoolCard
                key={spool.id}
                spool={spool}
                material={materialById[spool.material_id]}
                onEdit={() => handleSpoolEdit(spool)}
                onDelete={() => handleSpoolDelete(spool.id)}
              />
            ))}
          </div>
        )}
      </section>

      <MaterialModal
        open={showMaterialModal}
        isEditing={isEditing}
        form={form}
        manufacturers={manufacturers}
        onClose={handleReset}
        onChange={handleChange}
        onColorChange={handleColorChange}
        onNewManufacturer={openNewManufacturer}
        onSubmit={handleSave}
      />

      <ManufacturerModal
        open={showManufacturerModal}
        form={manufacturerForm}
        saving={savingManufacturer}
        onClose={() => setShowManufacturerModal(false)}
        onChange={handleManufacturerChange}
        onSubmit={saveManufacturer}
      />

      <SpoolModal
        open={showSpoolModal}
        form={spoolForm}
        isEditing={isEditingSpool}
        saving={savingSpool}
        materials={materials}
        onClose={handleSpoolReset}
        onChange={handleSpoolChange}
        onSubmit={handleSpoolSave}
      />
    </section>
  );
}
function FeedbackBanner({ feedback, onClose }) {
  if (!feedback) return null;
  const tone = getStatusTone(feedback.tone || "info");
  return (
    <div className={`terminal-card border ${tone.border} ${tone.bg} flex items-center justify-between gap-3`}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-dial">{feedback.tone}</p>
        <p className="text-gridline/80">{feedback.message}</p>
      </div>
      <button className="terminal-button is-ghost" onClick={onClose}>
        Sluiten
      </button>
    </div>
  );
}

function MaterialModal({ open, isEditing, form, manufacturers, onClose, onChange, onColorChange, onNewManufacturer, onSubmit }) {
  if (!open) return null;
  return (
    <div className="terminal-modal">
      <div className="terminal-modal__dialog w-full max-w-3xl">
        <header className="terminal-modal__header">
          <div>
            <p className="terminal-section-title">Materiaal</p>
            <h3 className="text-2xl font-semibold uppercase tracking-dial">
              {isEditing ? "Materiaal bijwerken" : "Nieuw materiaal"}
            </h3>
          </div>
          <button className="terminal-button is-ghost" onClick={onClose}>
            Sluiten
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="terminal-grid md:grid-cols-2">
            <InputField label="Naam" name="naam" value={form.naam} onChange={onChange} required />
            <InputField label="Type filament" name="type" value={form.type} onChange={onChange} placeholder="PLA, PETG, TPU..." />
            <ColorField label="Kleur" name="kleur" value={form.kleur} onChange={onChange} onColorChange={onColorChange} />
            <InputField
              label="Prijs per kilogram (EUR)"
              name="prijs_per_kg"
              type="number"
              min="0"
              step="0.01"
              value={form.prijs_per_kg}
              onChange={onChange}
              required
            />
            <InputField
              label="Bestellink"
              name="bestel_url"
              type="url"
              placeholder="https://leverancier.example/product"
              value={form.bestel_url}
              onChange={onChange}
              className="md:col-span-2"
            />
            <div className="space-y-2">
              <label className="terminal-label">Fabrikant</label>
              <div className="flex gap-2">
                <select
                  name="manufacturer_id"
                  value={form.manufacturer_id || ""}
                  onChange={onChange}
                  className="terminal-input flex-1"
                >
                  <option value="">Selecteer fabrikant</option>
                  {manufacturers.map((man) => (
                    <option key={man.id} value={man.id}>
                      {man.naam}
                    </option>
                  ))}
                </select>
                <button type="button" className="terminal-button is-ghost" onClick={onNewManufacturer}>
                  +
                </button>
              </div>
            </div>
            <InputField
              label="Voorraad (rollen)"
              name="stock_rollen"
              type="number"
              min="0"
              value={form.stock_rollen}
              onChange={onChange}
            />
            <InputField
              label="Winstmarge %"
              name="winstmarge_perc"
              type="number"
              min="0"
              step="0.1"
              value={form.winstmarge_perc}
              onChange={onChange}
            />
            <InputField label="Batch / lot" name="batch_code" value={form.batch_code} onChange={onChange} />
            <InputField label="Vervaldatum" name="vervaldatum" type="date" value={form.vervaldatum} onChange={onChange} />
            <div className="space-y-2">
              <label className="terminal-label">Droger status</label>
              <select
                name="droger_status"
                value={form.droger_status}
                onChange={onChange}
                className="terminal-input"
              >
                <option value="nvt">Niet van toepassing</option>
                <option value="droog">In droogkast</option>
                <option value="open">Open rek</option>
                <option value="in gebruik">In gebruik</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="terminal-checkbox">
              <input type="checkbox" name="moet_drogen" checked={form.moet_drogen} onChange={onChange} />
              <span>Droging vereist</span>
            </label>
            <label className="terminal-checkbox">
              <input type="checkbox" name="supportmateriaal" checked={form.supportmateriaal} onChange={onChange} />
              <span>Supportmateriaal</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="terminal-button is-ghost" onClick={onClose}>
              Annuleren
            </button>
            <button type="submit" className="terminal-button is-accent">
              {isEditing ? "Opslaan" : "Toevoegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function ManufacturerModal({ open, form, saving, onClose, onChange, onSubmit }) {
  if (!open) return null;
  return (
    <div className="terminal-modal">
      <div className="terminal-modal__dialog w-full max-w-lg">
        <header className="terminal-modal__header">
          <div>
            <p className="terminal-section-title">Nieuwe fabrikant</p>
            <h3 className="text-2xl font-semibold uppercase tracking-dial">Fabrikant toevoegen</h3>
          </div>
          <button className="terminal-button is-ghost" onClick={onClose}>
            Sluiten
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <InputField label="Naam" name="naam" value={form.naam} onChange={onChange} required />
          <InputField label="Land" name="land" value={form.land} onChange={onChange} />
          <InputField label="Website" name="website" value={form.website} onChange={onChange} placeholder="https://..." />
          <div className="flex justify-end gap-3">
            <button type="button" className="terminal-button is-ghost" onClick={onClose}>
              Annuleren
            </button>
            <button type="submit" className="terminal-button is-accent" disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SpoolModal({ open, form, isEditing, saving, materials, onClose, onChange, onSubmit }) {
  if (!open) return null;
  return (
    <div className="terminal-modal">
      <div className="terminal-modal__dialog w-full max-w-3xl">
        <header className="terminal-modal__header">
          <div>
            <p className="terminal-section-title">Rol</p>
            <h3 className="text-2xl font-semibold uppercase tracking-dial">
              {isEditing ? "Rol bijwerken" : "Nieuwe rol"}
            </h3>
          </div>
          <button className="terminal-button is-ghost" onClick={onClose}>
            Sluiten
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="terminal-grid md:grid-cols-2">
            <div className="space-y-2">
              <label className="terminal-label">Materiaal</label>
              <select
                name="material_id"
                value={form.material_id}
                onChange={onChange}
                required
                className="terminal-input"
              >
                <option value="">Kies materiaal</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.naam}
                  </option>
                ))}
              </select>
            </div>
            <InputField label="Label / interne naam" name="label" value={form.label} onChange={onChange} placeholder="Bijv. Opslagrek A2" />
            <div className="space-y-2">
              <label className="terminal-label">Status</label>
              <select name="status" value={form.status} onChange={onChange} className="terminal-input">
                <option value="sealed">Sealed</option>
                <option value="open">Open</option>
                <option value="reserve">Reserve</option>
                <option value="empty">Leeg</option>
              </select>
            </div>
            <InputField label="Locatie" name="locatie" value={form.locatie} onChange={onChange} placeholder="Rek / kamer" />
            <InputField
              label="Gewicht netto (g)"
              name="gewicht_netto_gram"
              type="number"
              min="0"
              value={form.gewicht_netto_gram}
              onChange={onChange}
            />
            <InputField
              label="Gewicht resterend (g)"
              name="gewicht_rest_gram"
              type="number"
              min="0"
              value={form.gewicht_rest_gram}
              onChange={onChange}
              placeholder="Leeg laten = netto"
            />
            <InputField label="Batch / lot" name="batch_code" value={form.batch_code} onChange={onChange} />
            <InputField label="Aankoopdatum" name="aankoop_datum" type="date" value={form.aankoop_datum} onChange={onChange} />
          </div>
          <div className="space-y-2">
            <label className="terminal-label">Notities</label>
            <textarea
              name="notities"
              value={form.notities}
              onChange={onChange}
              className="terminal-input min-h-[96px]"
              placeholder="Opmerkingen over kwaliteit, vocht, etc."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="terminal-button is-ghost" onClick={onClose}>
              Annuleren
            </button>
            <button type="submit" className="terminal-button is-accent" disabled={saving}>
              {saving ? "Opslaan..." : isEditing ? "Bijwerken" : "Toevoegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function SpoolCard({ spool, material, onEdit, onDelete }) {
  const tone = getStatusTone(spool.status);
  const name = spool.material_name || material?.naam || "Onbekend materiaal";
  const type = spool.material_type || material?.type || "Type onbekend";
  const kleur = spool.material_kleur || material?.kleur || "#d1d5db";
  return (
    <article className={`terminal-panel space-y-3 border ${tone.border} shadow-lg`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-gridline/70">{type}</p>
          <h4 className="text-lg font-semibold text-base-soft">{name}</h4>
          <p className="text-sm text-gridline/80 flex items-center gap-2">
            <span
              className="inline-flex h-4 w-4 rounded-full border border-gridline/30"
              style={{ background: kleur }}
            />
            {spool.label || "Rol"}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
          {spool.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gridline/80">
        <p>Locatie: {spool.locatie || "-"}</p>
        <p>Gewicht: {formatWeight(spool.gewicht_rest_gram ?? spool.gewicht_netto_gram)}</p>
        <p>Batch: {spool.batch_code || "-"}</p>
        <p>Fabrikant: {spool.manufacturer || "-"}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="terminal-button is-ghost text-xs" onClick={onEdit}>
          Wijzig
        </button>
        <button className="terminal-button is-danger text-xs" onClick={onDelete}>
          Verwijder
        </button>
      </div>
    </article>
  );
}

function getStatusTone(status) {
  switch (status) {
    case "success":
      return { border: "border-emerald-400/50", bg: "bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-200" };
    case "error":
      return { border: "border-rose-400/50", bg: "bg-rose-500/5", badge: "bg-rose-500/10 text-rose-200" };
    case "warning":
      return { border: "border-amber-400/50", bg: "bg-amber-500/5", badge: "bg-amber-500/10 text-amber-200" };
    case "open":
      return { border: "border-sky-400/40", bg: "bg-sky-500/5", badge: "bg-sky-500/10 text-sky-100" };
    case "reserve":
      return { border: "border-purple-400/40", bg: "bg-purple-500/5", badge: "bg-purple-500/10 text-purple-100" };
    case "empty":
      return {
        border: "border-slate-200/70",
        bg: "bg-slate-100/70",
        badge: "bg-slate-200 text-slate-800",
      };
    default:
      return { border: "border-gridline/30", bg: "bg-base/40", badge: "bg-gridline/20 text-gridline" };
  }
}

function formatWeight(gram) {
  if (gram === null || gram === undefined || gram === "") return "n.v.t.";
  const value = Number(gram);
  if (Number.isNaN(value)) return "n.v.t.";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} kg`;
  return `${value} g`;
}

function ColorField({ label, name, value, onChange, onColorChange }) {
  return (
    <div className="space-y-2">
      <label className="terminal-label" htmlFor={name}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="#2563eb"
          className="terminal-input flex-1"
        />
        <input
          type="color"
          value={value && value.startsWith("#") ? value : "#2563eb"}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-11 w-14 rounded border border-gridline/30 bg-transparent"
        />
      </div>
      <ColorSwatchPicker value={value} onSelect={onColorChange} />
    </div>
  );
}

function ColorSwatchPicker({ value, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_SWATCHES.map((swatch) => (
        <button
          type="button"
          key={swatch.value}
          className={`h-9 w-9 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-gridline/60 ${value === swatch.value ? "scale-105 border-white" : "border-gridline/30"}`}
          style={{ background: swatch.value === "transparant" ? "linear-gradient(135deg, #e5e7eb 50%, #ffffff 50%)" : swatch.value }}
          title={swatch.label}
          onClick={() => onSelect(swatch.value)}
        />
      ))}
    </div>
  );
}

function InputField({ label, name, className = "", ...inputProps }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="terminal-label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="terminal-input" {...inputProps} />
    </div>
  );
}

