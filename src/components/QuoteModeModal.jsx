export default function QuoteModeModal({ onClose, onSelectPrint, onSelectManual }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur">
      <div className="w-full max-w-lg rounded-card border border-gridline/60 bg-parchment/95 p-6 shadow-terminal space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="terminal-section-title">Nieuwe offerte</p>
            <h3 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Kies je werkwijze</h3>
            <p className="text-sm text-gridline/80">
              Gebruik de printcalculator of schrijf een handmatige offerte met custom regels.
            </p>
          </div>
          <button
            type="button"
            className="terminal-button is-ghost text-xs tracking-[0.12em]"
            onClick={onClose}
          >
            Sluiten
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onSelectPrint}
            className="rounded-card border border-primary/70 bg-base-soft/10 p-4 text-left shadow-terminal hover:-translate-y-1 hover:shadow-terminal-glow transition"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-primary">Print & calculatie</p>
            <p className="text-base font-semibold text-base-soft mt-1">3D-print flow</p>
            <p className="text-xs text-gridline/80 mt-2">Met materiaal/gewicht/tijd en kostencalculatie.</p>
          </button>
          <button
            type="button"
            onClick={onSelectManual}
            className="rounded-card border border-gridline/60 bg-base-soft/10 p-4 text-left shadow-terminal hover:-translate-y-1 hover:shadow-terminal-glow transition"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-primary">Handmatige offerte</p>
            <p className="text-base font-semibold text-base-soft mt-1">Custom regels</p>
            <p className="text-xs text-gridline/80 mt-2">Manueel regels toevoegen zoals in een offertesoftware.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
