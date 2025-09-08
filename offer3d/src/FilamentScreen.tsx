import { useState } from 'react'
import { useFilamentStore } from './store/filamentStore'
import type { Filament } from './types'

const emptyForm: Omit<Filament, 'id'> = {
  brand: '',
  material: '',
  color: '#ffffff',
  pricePerKg: 0,
  markupPct: 0
}

export default function FilamentScreen() {
  const { filaments, addFilament, removeFilament } = useFilamentStore()
  const [form, setForm] = useState(emptyForm)

  function handleChange<K extends keyof Omit<Filament, 'id'>>(
    key: K,
    value: Omit<Filament, 'id'>[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleAdd() {
    addFilament(form)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-6">
      <div className="glass p-5 sm:p-6 space-y-4">
        <h2 className="h2">Add Filament</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="label">Brand</span>
            <input
              className="input"
              value={form.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Material</span>
            <input
              className="input"
              value={form.material}
              onChange={(e) => handleChange('material', e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Color</span>
            <input
              className="input"
              type="color"
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Price €/kg</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.pricePerKg}
              onChange={(e) => handleChange('pricePerKg', Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span className="label">Markup %</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.markupPct}
              onChange={(e) => handleChange('markupPct', Number(e.target.value))}
            />
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          Save
        </button>
      </div>

      <div className="space-y-3">
        {filaments.map((f) => (
          <div key={f.id} className="glass p-4 flex items-center gap-4">
            <svg
              width="24"
              height="24"
              className="flex-shrink-0"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" fill={f.color} />
            </svg>
            <div className="flex-1 text-sm">
              <div>
                {f.brand} {f.material}
              </div>
              <div className="muted">
                € {f.pricePerKg.toFixed(2)} / kg · markup {f.markupPct}%
              </div>
            </div>
            <button className="btn" onClick={() => removeFilament(f.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
