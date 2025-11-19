import { useEffect, useState } from "react";
import { baseUrl } from "../lib/constants";

export default function PrintItemList({
  printItems = [],
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}) {
  const [filamentOptions, setFilamentOptions] = useState([]);

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const response = await fetch(`${baseUrl}/get-materials.php`);
        if (!response.ok) {
          throw new Error("Fout bij laden materialen");
        }
        const data = await response.json();
        setFilamentOptions(data);
      } catch (error) {
        console.error("Fout bij ophalen filamentopties:", error);
      }
    }

    fetchMaterials();
  }, []);

  if (!Array.isArray(printItems)) {
    return (
      <section className="terminal-card text-signal-red">
        <p className="tracking-[0.08em] uppercase">
          Er is iets mis met de lijst van printitems.
        </p>
      </section>
    );
  }

  return (
    <section className="terminal-card space-y-6">
      <header className="space-y-2">
        <p className="terminal-section-title">Printitems</p>
        <h2 className="text-2xl font-semibold tracking-dial uppercase">
          Configuratie
        </h2>
        <p className="text-sm text-gridline/70">
          Pas gegevens per printstuk aan en selecteer geschikte materialen.
        </p>
      </header>

      {printItems.length === 0 && (
        <p className="terminal-note">Nog geen printitems toegevoegd.</p>
      )}

      <div className="space-y-6">
        {printItems.map((item, index) => (
          <article
            key={index}
            className="rounded-card border border-gridline/60 bg-base-highlight/15 p-5 shadow-terminal-inset space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold tracking-dial uppercase">
                Printstuk {String(index + 1).padStart(2, "0")}
              </h3>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="terminal-button is-danger text-xs tracking-[0.12em]"
              >
                Verwijder
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Naam printstuk"
                type="text"
                value={item.name || ""}
                placeholder="Bijv. Behuizing frontpaneel"
                onChange={(value) => onUpdateItem(index, { ...item, name: value })}
              />

              <Field
                label="Aantal"
                type="number"
                min={1}
                value={item.aantal || 1}
                onChange={(value) =>
                  onUpdateItem(index, {
                    ...item,
                    aantal: parseInt(value, 10) || 1,
                  })
                }
              />

              <div>
                <p className="terminal-label mb-2">Printtijd</p>
                <div className="flex gap-3">
                  <Field
                    label="Uren"
                    type="number"
                    min={0}
                    value={item.hours || 0}
                    onChange={(value) =>
                      onUpdateItem(index, {
                        ...item,
                        hours: parseInt(value, 10) || 0,
                      })
                    }
                    inline
                  />
                  <Field
                    label="Minuten"
                    type="number"
                    min={0}
                    max={59}
                    value={item.minutes || 0}
                    onChange={(value) =>
                      onUpdateItem(index, {
                        ...item,
                        minutes: parseInt(value, 10) || 0,
                      })
                    }
                    inline
                  />
                  <Field
                    label="Seconden"
                    type="number"
                    min={0}
                    max={59}
                    value={item.seconds || 0}
                    onChange={(value) =>
                      onUpdateItem(index, {
                        ...item,
                        seconds: parseInt(value, 10) || 0,
                      })
                    }
                    inline
                  />
                </div>
              </div>

              <Field
                label="Gewicht (gram)"
                type="number"
                min={0}
                value={item.weight || 0}
                onChange={(value) =>
                  onUpdateItem(index, {
                    ...item,
                    weight: parseFloat(value) || 0,
                  })
                }
              />

              <div>
                <p className="terminal-label mb-2">Filamenttype</p>
                <select
                  value={item.materiaal_id || ""}
                  onChange={(event) => {
                    const selected = filamentOptions.find(
                      (option) => option.id === parseInt(event.target.value, 10)
                    );
                    if (!selected) return;

                    onUpdateItem(index, {
                      ...item,
                      materiaal_id: selected.id,
                      filamentType: selected.naam,
                      filamentDisplayName: `${selected.naam}${
                        selected.kleur ? ` (${selected.kleur})` : ""
                      }${
                        selected.manufacturer
                          ? ` - ${selected.manufacturer}`
                          : ""
                      }`,
                    });
                  }}
                  className="terminal-input"
                >
                  <option value="">-- Selecteer filament --</option>
                  {filamentOptions.map((filament) => (
                    <option key={filament.id} value={filament.id}>
                      {filament.naam}
                      {filament.kleur ? ` (${filament.kleur})` : ""}
                      {filament.manufacturer ? ` - ${filament.manufacturer}` : ""}
                    </option>
                  ))}
                </select>

                {item.materiaal_id && (
                  <p className="mt-2 text-xs text-gridline/70">
                    {(() => {
                      const filament = filamentOptions.find(
                        (option) => option.id === item.materiaal_id
                      );
                      if (!filament) return "";

                      const prijs = Number(filament.prijs_per_kg ?? 0).toFixed(2);
                      const drying = filament.moet_drogen
                        ? "Moet gedroogd worden"
                        : "Geen droogtijd nodig";
                      return `${prijs} EUR/kg - ${drying}`;
                    })()}
                  </p>
                )}
              </div>

              <Field
                label="Marge op filament (%)"
                type="number"
                min={0}
                value={item.margin ?? 20}
                onChange={(value) =>
                  onUpdateItem(index, {
                    ...item,
                    margin: parseFloat(value) || 0,
                  })
                }
              />

              <Field
                label="Model link (optioneel)"
                type="url"
                value={item.modelLink || ""}
                placeholder="https://printables.com/..."
                onChange={(value) =>
                  onUpdateItem(index, { ...item, modelLink: value })
                }
                wrapperClassName="md:col-span-2"
              />

              {item.modelleringNodig && (
                <Field
                  label="Modelleringstijd (uren)"
                  type="number"
                  min={0}
                  step="0.1"
                  value={item.modellering_uur ?? ""}
                  onChange={(value) =>
                    onUpdateItem(index, {
                      ...item,
                      modellering_uur: parseFloat(value) || 0,
                    })
                  }
                  wrapperClassName="md:col-span-2"
                />
              )}

              <div className="md:col-span-2 flex flex-wrap gap-6 pt-2 text-sm text-gridline/80">
                <label className="inline-flex items-center gap-3 tracking-[0.08em] uppercase">
                  <input
                    type="checkbox"
                    checked={item.supportmateriaal || false}
                    onChange={(event) =>
                      onUpdateItem(index, {
                        ...item,
                        supportmateriaal: event.target.checked,
                      })
                    }
                  />
                  Supportmateriaal nodig
                </label>

                <label className="inline-flex items-center gap-3 tracking-[0.08em] uppercase">
                  <input
                    type="checkbox"
                    checked={item.modelleringNodig || false}
                    onChange={(event) =>
                      onUpdateItem(index, {
                        ...item,
                        modelleringNodig: event.target.checked,
                        modellering_uur: event.target.checked
                          ? item.modellering_uur ?? 0
                          : 0,
                      })
                    }
                  />
                  Modellering nodig
                </label>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onAddItem}
          className="terminal-button is-accent"
        >
          Nieuw printstuk toevoegen
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  wrapperClassName = "",
  inline = false,
  onChange,
  ...props
}) {
  return (
    <label
      className={`flex flex-col gap-2 ${inline ? "flex-1" : ""} ${wrapperClassName}`}
    >
      <span className="terminal-label">{label}</span>
      <input
        {...props}
        className="terminal-input"
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}
