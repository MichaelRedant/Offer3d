import { useOfferStore } from "./store/offerStore";

export default function App() {
  const { input, result, addFilament, addDevice, updateField } = useOfferStore();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <h1 className="h1">Offer3D</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid gap-6 lg:grid-cols-2">
        {/* Left: inputs */}
        <section className="card">
          <div className="card-body space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Filament</h2>
              <button className="btn-ghost" onClick={addFilament}>+ Add</button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="section-title">Devices</h2>
              <button className="btn-ghost" onClick={addDevice}>+ Add</button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="label">Electricity price €/kWh</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={input.electricityCostPerKwh}
                  onChange={(e) => updateField("electricityCostPerKwh", Number(e.target.value))}
                />
              </label>

              <label className="block">
                <span className="label">Extra cost €</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={input.extraCost}
                  onChange={(e) => updateField("extraCost", Number(e.target.value))}
                />
              </label>

              <label className="block">
                <span className="label">VAT rate (0–1)</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0" max="1"
                  value={input.vatRate}
                  onChange={(e) => updateField("vatRate", Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Right: totals */}
        <aside className="card">
          <div className="card-body">
            <h2 className="section-title mb-4">Summary</h2>
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt>Material</dt><dd className="text-right">€ {result.material.toFixed(2)}</dd>
              <dt>Energy</dt><dd className="text-right">€ {result.energy.toFixed(2)}</dd>
              <dt>Equipment</dt><dd className="text-right">€ {result.equipment.toFixed(2)}</dd>
              <dt>Extra</dt><dd className="text-right">€ {result.extra.toFixed(2)}</dd>
              <dt className="pt-2 border-t mt-2">Excl. btw</dt><dd className="text-right pt-2 border-t mt-2">€ {result.net.toFixed(2)}</dd>
              <dt>VAT</dt><dd className="text-right">€ {result.vat.toFixed(2)}</dd>
              <dt className="font-semibold">Incl. btw</dt><dd className="text-right font-semibold">€ {result.total.toFixed(2)}</dd>
            </dl>

            <button className="btn w-full mt-4" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
