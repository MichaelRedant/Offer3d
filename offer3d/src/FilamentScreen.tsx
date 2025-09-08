import { useState } from 'react'
import { useFilamentStore } from './store/filamentStore'
import { useDeviceStore } from './store/deviceStore'
import type { Filament } from './types'
interface FormState extends Omit<Filament, 'id'> {
  dryerId: string
}

const emptyForm: FormState = {
  brand: '',
  material: '',
  color: '#ffffff',
  pricePerKg: 0,
  markupPct: 0,
  dryerId: '',
  dryingTimeHours: 0
}

export default function FilamentScreen() {
  const { filaments, addFilament, removeFilament } = useFilamentStore()
  const { devices } = useDeviceStore()
  const dryers = devices.filter((d) => d.category === 'dryer')
  const dryerMap = Object.fromEntries(dryers.map((d) => [d.id, d.name]))
  const [form, setForm] = useState<FormState>(emptyForm)

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleAdd() {
    const { dryerId, dryingTimeHours, ...rest } = form
    addFilament({
      ...rest,
      dryerId: dryerId || undefined,
      dryingTimeHours: dryerId ? dryingTimeHours : undefined
    })
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
          {dryers.length > 0 && (
            <label className="field">
              <span className="label">Dryer</span>
              <select
                className="input"
                value={form.dryerId}
                onChange={(e) => handleChange('dryerId', e.target.value)}
              >
                <option value="">None</option>
                {dryers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {form.dryerId && (
            <label className="field">
              <span className="label">Drying time (h)</span>
              <input
                className="input"
                type="number"
                step="0.1"
                value={form.dryingTimeHours}
                onChange={(e) =>
                  handleChange('dryingTimeHours', Number(e.target.value))
                }
              />
            </label>
          )}
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
                {f.dryerId && f.dryingTimeHours
                  ? ` · dries in ${f.dryingTimeHours}h with ${dryerMap[f.dryerId]}`
                  : ''}
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
