export default function SummarySection({ summary }) {
  if (!summary || !Array.isArray(summary.itemResultaten)) {
    return (
      <section className="terminal-card">
        <p className="terminal-note">Geen samenvattingsgegevens beschikbaar.</p>
      </section>
    );
  }

  const { itemResultaten = [], totals = {}, meta = {}, notes = [] } = summary;
  const printResults = itemResultaten.filter((entry) => entry.type !== "custom");
  const customResults = itemResultaten.filter((entry) => entry.type === "custom");

  return (
    <section className="terminal-card space-y-6">
      <header className="space-y-2">
        <p className="terminal-section-title">Overzicht</p>
        <h2 className="text-2xl font-semibold tracking-dial uppercase text-base-soft">Offerte samenvatting</h2>
      </header>

      {printResults.length === 0 && customResults.length === 0 && (
        <p className="terminal-note">Nog geen regels toegevoegd.</p>
      )}

      {printResults.length > 0 && (
        <div className="space-y-4">
          {printResults.map(({ item, kost }, index) => (
            <ItemSummary key={`print-${index}`} index={index} item={item} kost={kost} />
          ))}
        </div>
      )}

      {customResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="terminal-section-title mt-4">Custom regels</h3>
          {customResults.map(({ item, kost }, index) => (
            <CustomItemSummary key={`custom-${index}`} index={index} item={item} kost={kost} />
          ))}
        </div>
      )}

      <div className="terminal-divider" />

      <AggregateSummary totals={totals} meta={meta} summary={summary} />

      {notes.length > 0 && (
        <div className="rounded-card border border-gridline/40 bg-parchment/90 p-4 space-y-2 shadow-terminal-inset">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-base-soft">
            Notities
          </h3>
          <ul className="space-y-1 text-xs tracking-[0.08em] text-base-soft/90">
            {notes.map((note, idx) => (
              <li key={idx}>- {note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ItemSummary({ index, item, kost }) {
  if (!kost || kost.fout) {
    return (
      <article className="rounded-card border border-signal-red/50 bg-base-highlight/20 p-4 space-y-2">
        <header className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-dial uppercase">
            Printstuk {String(index + 1).padStart(2, "0")}
          </h3>
          {item?.name && <span className="terminal-pill">{item.name}</span>}
        </header>
        <p className="text-sm text-signal-red">{kost?.fout || "Fout bij berekening."}</p>
      </article>
    );
  }

  const perPrint = kost.quote.per_print;
  const totals = kost.quote.totals;

  return (
    <article className="rounded-card border border-gridline/40 bg-parchment/90 p-4 space-y-3 shadow-terminal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-dial uppercase text-base-soft">
          Printstuk {String(index + 1).padStart(2, "0")}
        </h3>
        <span className="terminal-pill text-base-soft">
          {item.aantal} {item.aantal === 1 ? "stuk" : "stuks"}
        </span>
      </div>

      <ul className="space-y-1 text-sm text-base-soft/90">
        <li>
          <span className="font-semibold text-base-soft">Naam:</span> {item.name || "Geen naam"}
        </li>
        <li>
          <span className="font-semibold text-base-soft">Materiaal:</span>{" "}
          {item.filamentType || "Niet opgegeven"}
        </li>
      </ul>

      <div className="grid gap-3 text-xs tracking-[0.08em] text-base-soft md:grid-cols-2">
        <div className="space-y-1">
          <p className="terminal-label">Per print</p>
          <KeyValue label="Materiaal (raw)" value={perPrint.material_raw} />
          <KeyValue label="Materiaal (markup)" value={perPrint.material_with_markup} />
          <KeyValue label="Elektriciteit" value={perPrint.electricity} />
          <KeyValue label="Kost vóór marge" value={perPrint.cost_before_margin} />
          <KeyValue label="Kost met marge" value={perPrint.cost_with_margin} />
        </div>
        <div className="space-y-1">
          <p className="terminal-label">Itemtotaal</p>
          <KeyValue label="Printkosten" value={totals.prints_total} />
          <KeyValue label="Ontwerpkost" value={totals.design_total} />
          <KeyValue label="Droogkosten" value={totals.drying_total} />
          <KeyValue label="Extra toeslagen" value={totals.extra_allowances} />
          <KeyValue label="Totaal" value={totals.subtotal} emphasized />
        </div>
      </div>
    </article>
  );
}

function AggregateSummary({ totals, meta, summary }) {
  const rows = [
    { label: "Printkosten (incl. marge)", value: totals.prints_total },
    { label: "Ontwerpkost", value: totals.design_total },
    { label: "Droogkosten", value: totals.drying_total },
    { label: "Extra toeslagen", value: totals.extra_allowances },
    { label: "Custom regels", value: totals.custom_total },
    { separator: true },
    {
      label: "Subtotaal vóór levering",
      value: totals.subtotal_before_delivery,
      accent: "primary",
    },
    {
      label: `Levering (${meta.delivery_type || "afhaling"})`,
      value: totals.delivery_cost,
    },
    {
      label: "Subtotaal na levering",
      value: totals.subtotal,
      accent: "primary",
    },
    {
      label: `Korting (${(meta.discount_percent ?? 0).toFixed(1)}%)`,
      value: -Math.abs(totals.discount_value || 0),
      accent: "signal-green",
    },
    {
      label: "Totaal netto (na korting)",
      value: totals.total_final,
      accent: "accent",
      emphasized: true,
    },
    {
      label: "Twijfelkorting (netto)",
      value: totals.total_with_soft_discount,
      accent: "signal-green",
    },
    { separator: true },
    {
      label: `BTW (${totals.vat_percent?.toFixed(1) ?? "21.0"}%)`,
      value: totals.vat_amount,
    },
    {
      label: "Eindtotaal incl. btw",
      value: totals.total_including_vat,
      accent: "accent",
      emphasized: true,
    },
  ];

  return (
    <>
      <div className="space-y-2 text-sm tracking-[0.08em] text-base-soft">
        {rows.map((row, idx) =>
          row.separator ? (
            <div key={`sep-${idx}`} className="terminal-divider" />
          ) : (
            <SummaryRow
              key={row.label}
              label={row.label}
              value={row.value}
              accent={row.accent}
              emphasized={row.emphasized}
            />
          )
        )}
      </div>

      <div className="rounded-card border border-gridline/40 bg-parchment/90 p-4 shadow-terminal-inset space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-base-soft">
          Winstanalyse
        </h3>
        <SummaryRow
          label="Totale kost om te produceren"
          value={summary.totaleEigenKost}
        />
        <SummaryRow
          label="Winstbedrag"
          value={summary.winstBedrag}
          accent="signal-green"
        />
        <SummaryRow
          label="Winstmarge"
          value={`${summary.winstPerc} %`}
          accent="signal-green"
        />
      </div>
    </>
  );
}

function KeyValue({ label, value, emphasized = false }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink/90">{label}</span>
      <span className={emphasized ? "font-semibold text-ink" : "text-ink/90"}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function CustomItemSummary({ index, item, kost }) {
  const subtotal = typeof kost?.subtotal === "number" ? kost.subtotal : 0;
  const cost = typeof kost?.kost === "number" ? kost.kost : 0;
  const marginPercent = typeof kost?.margin_percent === "number" ? kost.margin_percent : 0;
  const included = item?.is_selected ?? item?.included ?? true;
  const optional = item?.is_optional ?? item?.optional ?? false;

  return (
    <article className="rounded-card border border-gridline/40 bg-parchment/90 p-4 shadow-terminal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-dial uppercase text-base-soft">
          Custom regel {String(index + 1).padStart(2, "0")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {optional && <span className="terminal-pill">Optioneel</span>}
          {!included && <span className="terminal-pill border-signal-amber/70 text-signal-amber">Niet meegerekend</span>}
        </div>
      </div>
      <div className="space-y-1 text-sm text-base-soft/90">
        <p>
          <span className="font-semibold text-base-soft">Titel:</span> {item?.title || "Geen titel"}
        </p>
        {item?.description && (
          <p className="text-base-soft/80">{item.description}</p>
        )}
      </div>
      <div className="grid gap-3 text-xs tracking-[0.08em] text-base-soft md:grid-cols-2 mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base-soft/90">Hoeveelheid</span>
          <span className="text-base-soft">{`${item.quantity ?? 0} ${item.unit || ""}`}</span>
        </div>
        <KeyValue label="Verkoop (excl. btw)" value={subtotal} emphasized />
        <KeyValue label="Kost (intern)" value={cost} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-base-soft/90">Marge %</span>
          <span className="text-base-soft">{`${marginPercent.toFixed(1)} %`}</span>
        </div>
      </div>
    </article>
  );
}

const ACCENT_CLASS = {
  primary: "text-primary",
  accent: "text-accent",
  "signal-green": "text-signal-green",
};

function SummaryRow({ label, value, accent, emphasized = false }) {
  const accentClass = accent ? ACCENT_CLASS[accent] ?? "text-ink" : "text-ink";
  const emphasisClass = emphasized ? "text-lg font-semibold tracking-[0.12em] text-ink" : "text-ink";

  const formattedValue =
    typeof value === "number"
      ? formatCurrency(value)
      : `${value}`.startsWith("-")
        ? `- ${formatCurrency(Math.abs(Number(value))) || value}`
        : formatCurrency(value);

  return (
    <div className={`flex items-center justify-between gap-4 ${emphasisClass}`}>
      <span className="text-ink/90">{label}</span>
      <span className={accentClass}>{formattedValue}</span>
    </div>
  );
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return typeof value === "string" ? value : "0.00 EUR";
  }
  return `${numeric.toFixed(2)} EUR`;
}
