import { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../context/SettingsContext";

export default function QuoteForm({ onChange }) {
  const { settings } = useContext(SettingsContext);
  const [form, setForm] = useState({
    offertedatum: new Date().toISOString().split("T")[0],
    aantalPrints: 1,
    meerderePrintbedden: false,
    groepeerPerBed: false,
    globaleWinstmarge: 0,
    gebruikGeenMarge: false,
    gebruikIndividueleMarges: false,
    elektriciteitsprijs: "",
    overrideElektriciteitsprijs: false,
    vasteStartkost: 0,
    vervoerskost: 0,
    extraAllowances: 0,
    deliveryType: "afhaling",
    materialMarkup: 20,
    korting: 0,
    btw: 21,
  });

  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        globaleWinstmarge: settings.standaardWinstmarge,
        elektriciteitsprijs: settings.elektriciteitsprijs,
        vasteStartkost: settings.vasteStartkost,
        vervoerskost: settings.vervoerskost,
        extraAllowances: settings.extraAllowances ?? prev.extraAllowances,
        deliveryType: settings.deliveryType ?? "afhaling",
        materialMarkup:
          settings.materialMarkup ?? settings.materiaalOpslagPerc ?? prev.materialMarkup,
        korting: settings.korting,
        btw: settings.btw,
      }));
    }
  }, [settings]);

  useEffect(() => {
    onChange?.(form);
  }, [form, onChange]);

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    const parsed =
      type === "number" ? (value === "" ? 0 : parseFloat(value) || 0) : value;

    setForm((prev) => ({
      ...prev,
      [name]: parsed,
    }));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    let updated = { ...form, [name]: checked };

    if (name === "gebruikIndividueleMarges" && checked) {
      updated.gebruikGeenMarge = false;
    } else if (name === "gebruikGeenMarge" && checked) {
      updated.gebruikIndividueleMarges = false;
    }

    if (name === "overrideElektriciteitsprijs" && !checked) {
      updated.elektriciteitsprijs = settings?.elektriciteitsprijs || 0;
    }

    setForm(updated);
  };

  if (!settings) {
    return (
      <section className="terminal-card">
        <p className="terminal-note">Instellingen laden...</p>
      </section>
    );
  }

  return (
    <section className="terminal-card space-y-6">
      <header className="space-y-2">
        <p className="terminal-section-title">Formulier</p>
        <h2 className="text-2xl font-semibold tracking-dial uppercase">
          Offertegegevens
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Offertedatum"
          type="date"
          name="offertedatum"
          value={form.offertedatum}
          onChange={handleChange}
        />

        <Input
          label="Aantal prints"
          type="number"
          name="aantalPrints"
          value={form.aantalPrints}
          onChange={handleChange}
          min={1}
        />

        <div className="md:col-span-2">
          <Checkbox
            label="Meerdere printbedden?"
            name="meerderePrintbedden"
            checked={form.meerderePrintbedden}
            onChange={handleCheckboxChange}
          />
        </div>

        {form.meerderePrintbedden && (
          <div className="md:col-span-2">
            <Checkbox
              label="Groepeer items per bed"
              name="groepeerPerBed"
              checked={form.groepeerPerBed}
              onChange={handleCheckboxChange}
            />
          </div>
        )}

        <Input
          label="Globale winstmarge (%)"
          type="number"
          name="globaleWinstmarge"
          value={form.globaleWinstmarge}
          onChange={handleChange}
          disabled={form.gebruikGeenMarge || form.gebruikIndividueleMarges}
          min={0}
        />

        <div className="space-y-3">
          <Checkbox
            label="Geen marge toepassen"
            name="gebruikGeenMarge"
            checked={form.gebruikGeenMarge}
            onChange={handleCheckboxChange}
          />
          <Checkbox
            label="Gebruik marges per item"
            name="gebruikIndividueleMarges"
            checked={form.gebruikIndividueleMarges}
            onChange={handleCheckboxChange}
          />
        </div>

        <Input
          label="Elektriciteitsprijs (EUR/kWh)"
          type="number"
          step="0.0001"
          name="elektriciteitsprijs"
          value={form.elektriciteitsprijs}
          onChange={handleChange}
          disabled={!form.overrideElektriciteitsprijs}
          min={0}
        />

        <Checkbox
          label="Elektriciteit override?"
          name="overrideElektriciteitsprijs"
          checked={form.overrideElektriciteitsprijs}
          onChange={handleCheckboxChange}
        />

        <Input
          label="Vaste startkost (EUR)"
          type="number"
          name="vasteStartkost"
          value={form.vasteStartkost}
          onChange={handleChange}
          min={0}
          step={0.01}
        />

        <Input
          label="Vervoerskost (EUR)"
          type="number"
          name="vervoerskost"
          value={form.vervoerskost}
          onChange={handleChange}
          min={0}
          step={0.01}
        />

        <Input
          label="Extra toeslagen project (EUR)"
          type="number"
          name="extraAllowances"
          value={form.extraAllowances}
          onChange={handleChange}
          min={0}
          step={0.01}
        />

        <Input
          label="Korting (%)"
          type="number"
          name="korting"
          value={form.korting}
          onChange={handleChange}
          min={0}
          step={0.01}
        />

        <Input
          label="Materiaalopslag (%)"
          type="number"
          name="materialMarkup"
          value={form.materialMarkup}
          onChange={handleChange}
          min={0}
          step={0.01}
        />

        <Select
          label="Leveringsoptie"
          name="deliveryType"
          value={form.deliveryType}
          onChange={handleChange}
          options={[
            { value: "afhaling", label: "Afhaling" },
            { value: "post", label: "Post" },
            { value: "24h", label: "Spoed 24h" },
            { value: "48h", label: "Snelle levering 48h" },
          ]}
        />

        <Input
          label="BTW (%)"
          type="number"
          name="btw"
          value={form.btw}
          onChange={handleChange}
          min={0}
          step={0.01}
        />
      </div>
    </section>
  );
}

function Input({ label, wrapperClassName = "", ...props }) {
  return (
    <label className={`flex flex-col gap-2 ${wrapperClassName}`}>
      <span className="terminal-label">{label}</span>
      <input {...props} className="terminal-input" />
    </label>
  );
}

function Select({ label, name, value, onChange, options = [], wrapperClassName = "" }) {
  return (
    <label className={`flex flex-col gap-2 ${wrapperClassName}`}>
      <span className="terminal-label">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="terminal-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, wrapperClassName = "", name, checked, onChange }) {
  return (
    <label
      className={`flex items-center gap-3 text-sm tracking-[0.08em] text-gridline/80 ${wrapperClassName}`}
    >
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      <span className="uppercase">{label}</span>
    </label>
  );
}
