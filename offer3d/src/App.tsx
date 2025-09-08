import { useOfferStore } from './store/offerStore'

function App() {
  const {
    input,
    result,
    updateField,
    addFilament,
    updateFilament,
    removeFilament,
    addDevice,
    updateDevice,
    removeDevice
  } = useOfferStore()

  return (
    <main className="w-full p-4">
      <div className="rounded-3xl shadow-2xl max-w-2xl w-full mx-auto p-8 space-y-8 transition-all bg-white/10 backdrop-blur-xl border border-white/20">
        <h1 className="text-3xl font-light text-center">Offer3D</h1>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Filament</h2>
            <button
              type="button"
              className="px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition"
              onClick={addFilament}
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {input.filaments.map((f) => (
              <div key={f.id} className="grid grid-cols-3 gap-2 items-center">
                <input
                  type="number"
                  placeholder="grams"
                  className="w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={f.grams}
                  onChange={(e) =>
                    updateFilament(f.id, 'grams', Number(e.target.value))
                  }
                />
                <input
                  type="number"
                  placeholder="€/kg"
                  className="w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={f.costPerKg}
                  onChange={(e) =>
                    updateFilament(f.id, 'costPerKg', Number(e.target.value))
                  }
                />
                <button
                  type="button"
                  className="text-sm text-red-200 hover:text-red-400"
                  onClick={() => removeFilament(f.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Devices</h2>
            <button
              type="button"
              className="px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition"
              onClick={addDevice}
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {input.devices.map((d) => (
              <div key={d.id} className="grid grid-cols-4 gap-2 items-center">
                <input
                  type="text"
                  placeholder="name"
                  className="w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={d.name}
                  onChange={(e) =>
                    updateDevice(d.id, 'name', e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="kWh"
                  className="w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={d.electricityKwh}
                  onChange={(e) =>
                    updateDevice(d.id, 'electricityKwh', Number(e.target.value))
                  }
                />
                <input
                  type="number"
                  placeholder="cost €"
                  className="w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={d.cost}
                  onChange={(e) =>
                    updateDevice(d.id, 'cost', Number(e.target.value))
                  }
                />
                <button
                  type="button"
                  className="text-sm text-red-200 hover:text-red-400"
                  onClick={() => removeDevice(d.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <label className="block text-sm">
            <span>Electricity price €/kWh</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={input.electricityCostPerKwh}
              onChange={(e) =>
                updateField('electricityCostPerKwh', Number(e.target.value))
              }
            />
          </label>

          <label className="block text-sm">
            <span>Extra cost €</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md bg-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={input.extraCost}
              onChange={(e) => updateField('extraCost', Number(e.target.value))}
            />
          </label>
        </section>

        <section className="pt-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Material</span>
            <span className="tabular-nums">€ {result.material.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Energy</span>
            <span className="tabular-nums">€ {result.energy.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Equipment</span>
            <span className="tabular-nums">€ {result.equipment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Extra</span>
            <span className="tabular-nums">€ {result.extra.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Excl. btw</span>
            <span className="tabular-nums">€ {result.net.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Incl. btw</span>
            <span className="tabular-nums">€ {result.total.toFixed(2)}</span>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
