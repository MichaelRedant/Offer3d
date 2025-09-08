import { useOfferStore } from './store/offerStore'

function App() {
  const { input, result, update } = useOfferStore()

  return (
    <main className="w-full p-4">
      <div className="bg-white/30 backdrop-blur-md rounded-2xl shadow-lg max-w-md w-full mx-auto p-6 space-y-4 transition-all hover:shadow-xl">
        <h1 className="text-2xl font-semibold text-center">Offer3D</h1>

        <label className="block text-sm">
          <span>Filament (g)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-white/50 border border-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={input.filamentGrams}
            onChange={(e) => update('filamentGrams', Number(e.target.value))}
          />
        </label>

        <label className="block text-sm">
          <span>Filament prijs €/kg</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-white/50 border border-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={input.filamentCostPerKg}
            onChange={(e) => update('filamentCostPerKg', Number(e.target.value))}
          />
        </label>

        <label className="block text-sm">
          <span>Elektriciteit (kWh)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-white/50 border border-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={input.electricityKwh}
            onChange={(e) => update('electricityKwh', Number(e.target.value))}
          />
        </label>

        <label className="block text-sm">
          <span>Elektriciteitsprijs €/kWh</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-white/50 border border-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={input.electricityCostPerKwh}
            onChange={(e) => update('electricityCostPerKwh', Number(e.target.value))}
          />
        </label>

        <label className="block text-sm">
          <span>Extra kosten €</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-white/50 border border-white/20 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={input.extraCost}
            onChange={(e) => update('extraCost', Number(e.target.value))}
          />
        </label>

        <div className="pt-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Excl. btw</span>
            <span className="tabular-nums">€ {result.net.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Incl. btw</span>
            <span className="tabular-nums font-medium">€ {result.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
