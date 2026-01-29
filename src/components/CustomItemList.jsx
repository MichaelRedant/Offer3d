import React from "react";

const UNIT_OPTIONS = [
  { value: "stuk", label: "Per stuk" },
  { value: "uur", label: "Per uur" },
  { value: "set", label: "Per set" },
];

export default function CustomItemList({ items = [], onAddItem, onUpdateItem, onRemoveItem }) {
  return (
    <section className="terminal-card space-y-6">
      <header className="space-y-2">
        <p className="terminal-section-title">Custom regels</p>
        <h2 className="text-2xl font-semibold tracking-dial uppercase">Diensten & bundels</h2>
        <p className="text-sm text-gridline/70">
          Voeg niet-print regels toe (diensten, afwerking, assemblage). Kost- en margevelden zijn alleen intern zichtbaar.
        </p>
      </header>

      {items.length === 0 && <p className="terminal-note">Nog geen custom regels.</p>}

      <div className="space-y-4">
        {items.map((item, index) => (
          <article
            key={index}
            className="rounded-card border border-gridline/60 bg-base-highlight/10 p-5 shadow-terminal space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold tracking-dial uppercase">
                Custom regel {String(index + 1).padStart(2, "0")}
              </h3>
              <button
                type="button"
                onClick={() => onRemoveItem?.(index)}
                className="terminal-button is-danger text-xs tracking-[0.12em]"
              >
                Verwijder
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Titel"
                type="text"
                value={item.title || ""}
                onChange={(value) => onUpdateItem?.(index, { ...item, title: value })}
                placeholder="Bijv. Assemblage, Coating, On-site installatie"
              />
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="terminal-label">Omschrijving (optioneel)</span>
                <textarea
                  className="terminal-input min-h-[84px]"
                  value={item.description || ""}
                  onChange={(e) => onUpdateItem?.(index, { ...item, description: e.target.value })}
                  placeholder="Details voor klant (komt in PDF)."
                />
              </label>

              <Field
                label="Hoeveelheid"
                type="number"
                min={0}
                step="0.01"
                value={item.quantity ?? 1}
                onChange={(value) =>
                  onUpdateItem?.(index, {
                    ...item,
                    quantity: parseFloat(value) || 0,
                  })
                }
              />

              <label className="flex flex-col gap-2">
                <span className="terminal-label">Eenheid</span>
                <select
                  className="terminal-input"
                  value={item.unit || "stuk"}
                  onChange={(e) => onUpdateItem?.(index, { ...item, unit: e.target.value })}
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Verkoopprijs (excl. btw)"
                type="number"
                min={0}
                step="0.01"
                value={item.price_amount ?? 0}
                onChange={(value) =>
                  onUpdateItem?.(index, { ...item, price_amount: parseFloat(value) || 0 })
                }
              />

              <Field
                label="Kostprijs (intern)"
                type="number"
                min={0}
                step="0.01"
                value={item.cost_amount ?? 0}
                onChange={(value) =>
                  onUpdateItem?.(index, { ...item, cost_amount: parseFloat(value) || 0 })
                }
                helper="Niet zichtbaar in PDF."
              />

              <Field
                label="Marge (%)"
                type="number"
                min={0}
                step="0.01"
                value={item.margin_percent ?? 0}
                onChange={(value) =>
                  onUpdateItem?.(index, { ...item, margin_percent: parseFloat(value) || 0 })
                }
                helper="Optioneel; voor interne analyse."
              />

              <Field
                label="BTW (%)"
                type="number"
                min={0}
                step="0.01"
                value={item.vat_percent ?? 0}
                onChange={(value) =>
                  onUpdateItem?.(index, { ...item, vat_percent: parseFloat(value) || 0 })
                }
                helper="0% standaard; pas aan indien btw-plichtig."
              />

              <label className="inline-flex items-center gap-3 text-sm tracking-[0.08em] text-gridline/80">
                <input
                  type="checkbox"
                  checked={Boolean(item.is_optional)}
                  onChange={(e) =>
                    onUpdateItem?.(index, {
                      ...item,
                      is_optional: e.target.checked,
                      is_selected: e.target.checked ? Boolean(item.is_selected) : true,
                    })
                  }
                />
                <span>Markeer als optioneel (bundel/upsell)</span>
              </label>

              {item.is_optional && (
                <label className="inline-flex items-center gap-3 text-sm tracking-[0.08em] text-gridline/80">
                  <input
                    type="checkbox"
                    checked={Boolean(item.is_selected)}
                    onChange={(e) =>
                      onUpdateItem?.(index, { ...item, is_selected: e.target.checked })
                    }
                  />
                  <span>Meerekenen in totaal</span>
                </label>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="pt-2">
        <button type="button" onClick={onAddItem} className="terminal-button is-accent">
          Custom regel toevoegen
        </button>
      </div>
    </section>
  );
}

function Field({ label, helper, onChange, ...props }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="terminal-label">{label}</span>
      <input
        {...props}
        className="terminal-input"
        onChange={(event) => onChange?.(event.target.value)}
      />
      {helper && <span className="text-xs text-gridline/70">{helper}</span>}
    </label>
  );
}
