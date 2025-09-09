import { useState } from "react";
import { useOfferStore } from "./store/offerStore";
import { useFilamentStore } from "./store/filamentStore";
import { useDeviceStore } from "./store/deviceStore";
import FilamentScreen from "./FilamentScreen";
import DeviceScreen from "./DeviceScreen";

export default function App() {
  const [view, setView] = useState<"offer" | "filaments" | "devices">("offer");
  const {
    input,
    result,
    addFilament,
    addDevice,
    updateField,
    updateFilament,
    setFilamentPreset,
    removeFilament,
    setDevicePreset,
    setDeviceHours,
    updateDevice,
    removeDevice,
    fetchElectricityPrice
  } = useOfferStore();
  const { filaments } = useFilamentStore();
  const { devices } = useDeviceStore();

  return (
    <div className="min-h-dvh relative">
      {/* Topbar */}
      <header className="sticky top-0 z-20">
        <div className="container-pro">
          <div className="mt-4 rounded-2xl glass px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-white/10 backdrop-blur border border-white/20" />
              <h1 className="h1">Offer3D</h1>
              <nav className="ml-auto flex gap-2">
                <button className="btn" onClick={() => setView("offer")}>Offer</button>
                <button className="btn" onClick={() => setView("filaments")}>Filaments</button>
                <button className="btn" onClick={() => setView("devices")}>Devices</button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container-pro py-6">
        {view === "offer" ? (
          <>
            {/* Accent aura achter de summary card (decoratief) */}
            <div aria-hidden className="pointer-events-none absolute -z-10 inset-0">
              <div className="absolute right-10 top-24 h-72 w-72 rounded-full blur-3xl opacity-40
                  bg-[conic-gradient(from_180deg_at_50%_50%,rgba(99,102,241,.6),rgba(16,185,129,.35),transparent_60%)]" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">

              {/* Left: Inputs */}
              <section className="glass p-5 sm:p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="h2">Filament</h2>
                    <div className="flex gap-2">
                      <button className="btn" onClick={addFilament}>+ Add</button>
                      <button className="btn" onClick={() => setView("filaments")}>Manage</button>
                    </div>
                  </div>
                  {input.filaments.map(f => (
                    <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr,auto,auto] items-end">
                      <label className="field">
                        <span className="label">Type</span>
                        <select
                          className="input"
                          value={f.filamentId ?? ""}
                          onChange={e => {
                            const fil = filaments.find(fl => fl.id === e.target.value)
                            const dryer = fil?.dryerId ? devices.find(d => d.id === fil.dryerId) : undefined
                            if (fil) setFilamentPreset(f.id, fil, dryer)
                          }}
                        >
                          <option value="">Select...</option>
                          {filaments.map(fl => (
                            <option key={fl.id} value={fl.id}>{fl.brand} {fl.material}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span className="label">Grams</span>
                        <input
                          className="input"
                          type="number" step="0.1"
                          value={f.grams}
                          onChange={e => updateFilament(f.id, 'grams', Number(e.target.value))}
                        />
                      </label>
                      <button className="btn" onClick={() => removeFilament(f.id)}>Remove</button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="h2">Devices</h2>
                    <div className="flex gap-2">
                      <button className="btn" onClick={addDevice}>+ Add</button>
                      <button className="btn" onClick={() => setView("devices")}>Manage</button>
                    </div>
                  </div>
                  {input.devices.map(d => (
                    <div key={d.id} className="grid gap-2 sm:grid-cols-[1fr,auto,auto,auto] items-end">
                      <label className="field">
                        <span className="label">Device</span>
                        <select
                          className="input"
                          value={d.deviceId ?? ""}
                          onChange={e => {
                            const dev = devices.find(dd => dd.id === e.target.value)
                            if (dev) setDevicePreset(d.id, dev)
                          }}
                        >
                          <option value="">Select...</option>
                          {devices.map(dev => (
                            <option key={dev.id} value={dev.id}>{dev.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span className="label">Hours</span>
                        <input
                          className="input"
                          type="number" step="0.1"
                          value={d.hours}
                          onChange={e => {
                            const dev = devices.find(dd => dd.id === d.deviceId)
                            setDeviceHours(d.id, Number(e.target.value), dev)
                          }}
                        />
                      </label>
                      <label className="field">
                        <span className="label">Purchase %</span>
                        <input
                          className="input"
                          type="number" step="0.01"
                          value={d.purchasePct}
                          onChange={e => updateDevice(d.id, 'purchasePct', Number(e.target.value))}
                        />
                      </label>
                      <button className="btn" onClick={() => removeDevice(d.id)}>Remove</button>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field">
                    <span className="label">Electricity price €/kWh</span>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        type="number" step="0.01"
                        value={input.electricityCostPerKwh}
                        onChange={e => updateField("electricityCostPerKwh", Number(e.target.value))}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void fetchElectricityPrice()}
                      >
                        Fetch
                      </button>
                    </div>
                  </label>

                  <label className="field">
                    <span className="label">Extra cost €</span>
                    <input
                      className="input"
                      type="number" step="0.01"
                      value={input.extraCost}
                      onChange={e => updateField("extraCost", Number(e.target.value))}
                    />
                  </label>

                  <label className="field">
                    <span className="label">Profit margin %</span>
                    <input
                      className="input"
                      type="number" step="0.01"
                      value={input.profitMarginPct}
                      onChange={e => updateField("profitMarginPct", Number(e.target.value))}
                    />
                  </label>

                  <label className="field">
                    <span className="label">VAT rate (0–1)</span>
                    <input
                      className="input"
                      type="number" step="0.01" min={0} max={1}
                      value={input.vatRate}
                      onChange={e => updateField("vatRate", Number(e.target.value))}
                    />
                  </label>
                </div>
              </section>

              {/* Right: Summary */}
              <aside className="glass p-5 sm:p-6">
                <h2 className="h2 mb-4">Summary</h2>
                <dl className="space-y-1">
                  <div className="stat"><dt className="muted">Material</dt><dd>€ {result.material.toFixed(2)}</dd></div>
                  <div className="stat"><dt className="muted">Energy</dt><dd>€ {result.energy.toFixed(2)}</dd></div>
                  <div className="stat"><dt className="muted">Equipment</dt><dd>€ {result.equipment.toFixed(2)}</dd></div>
                  <div className="stat"><dt className="muted">Extra</dt><dd>€ {result.extra.toFixed(2)}</dd></div>
                  <div className="stat"><dt className="muted">Profit</dt><dd>€ {result.profit.toFixed(2)}</dd></div>
                  <div className="stat"><dt className="muted">Purchase</dt><dd>€ {result.purchase.toFixed(2)}</dd></div>
                  <div className="stat pt-2 border-t border-white/10"><dt className="muted">Excl. btw</dt><dd>€ {result.net.toFixed(2)}</dd></div>
                  <div className="stat"><dt className="muted">VAT</dt><dd>€ {result.vat.toFixed(2)}</dd></div>
                  <div className="stat text-base font-semibold"><dt>Incl. btw</dt><dd>€ {result.total.toFixed(2)}</dd></div>
                </dl>

                <button className="btn btn-primary w-full mt-5" onClick={() => window.print()}>
                  Print / Save PDF
                </button>
              </aside>

            </div>
          </>
        ) : view === "filaments" ? (
          <FilamentScreen />
        ) : (
          <DeviceScreen />
        )}
      </main>
    </div>
  );
}
