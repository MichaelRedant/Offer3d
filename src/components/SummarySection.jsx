export default function SummarySection({ summary }) {
  if (!summary || !Array.isArray(summary.itemResultaten)) {
    return (
      <section className="terminal-card">
        <p className="terminal-note">Geen samenvattingsgegevens beschikbaar.</p>
      </section>
    );
  }

  const { itemResultaten = [], totals = {}, meta = {}, notes = [] } = summary;

  return (
    <section className="terminal-card space-y-6">
      <header className="space-y-2">
        <p className="terminal-section-title">Overzicht</p>
        <h2 className="text-2xl font-semibold tracking-dial uppercase">Offerte samenvatting</h2>
      </header>

      {itemResultaten.length === 0 ? (
        <p className="terminal-note">Nog geen printitems toegevoegd.</p>
      ) : (
        <div className="space-y-4">
          {itemResultaten.map(({ item, kost }, index) => (
            <ItemSummary key={index} index={index} item={item} kost={kost} />
          ))}
        </div>
      )}

      <div className="terminal-divider" />

      <AggregateSummary totals={totals} meta={meta} summary={summary} />

      {notes.length > 0 && (
        <div className="rounded-card border border-gridline/60 bg-base-highlight/20 p-4 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gridline">
            Notities
          </h3>
          <ul className="space-y-1 text-xs tracking-[0.08em] text-gridline/70">
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
    <article className="rounded-card border border-gridline/60 bg-base-highlight/20 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-dial uppercase">
          Printstuk {String(index + 1).padStart(2, "0")}
        </h3>
        <span className="terminal-pill">
          {item.aantal} {item.aantal === 1 ? "stuk" : "stuks"}
        </span>
      </div>

      <ul className="space-y-1 text-sm text-gridline/80">
        <li>
          <span className="font-semibold">Naam:</span> {item.name || "Geen naam"}
        </li>
        <li>
          <span className="font-semibold">Materiaal:</span>{" "}
          {item.filamentType || "Niet opgegeven"}
        </li>
      </ul>

      <div className="grid gap-3 text-xs tracking-[0.08em] text-gridline/70 md:grid-cols-2">
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
      <div className="space-y-2 text-sm tracking-[0.08em] text-gridline/90">
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

      <div className="rounded-card border border-gridline/50 bg-base-highlight/25 p-4 shadow-terminal-inset space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gridline">
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
      <span>{label}</span>
      <span className={emphasized ? "font-semibold text-ink" : ""}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

const ACCENT_CLASS = {
  primary: "text-primary",
  accent: "text-accent",
  "signal-green": "text-signal-green",
};

function SummaryRow({ label, value, accent, emphasized = false }) {
  const accentClass = accent ? ACCENT_CLASS[accent] ?? "" : "";
  const emphasisClass = emphasized ? "text-lg font-semibold tracking-[0.12em]" : "";

  const formattedValue =
    typeof value === "number"
      ? formatCurrency(value)
      : `${value}`.startsWith("-")
        ? `- ${formatCurrency(Math.abs(Number(value))) || value}`
        : formatCurrency(value);

  return (
    <div className={`flex items-center justify-between gap-4 ${accentClass} ${emphasisClass}`}>
      <span>{label}</span>
      <span>{formattedValue}</span>
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
