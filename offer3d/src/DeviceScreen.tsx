import { useState } from 'react'
import { useDeviceStore } from './store/deviceStore'
import type { Device, DeviceCategory } from './types'

const emptyForm: Omit<Device, 'id'> = {
  name: '',
  category: 'printer',
  kwhPerHour: 0,
  costPerHour: 0,
  purchasePrice: 0
}

export default function DeviceScreen() {
  const { devices, addDevice, removeDevice } = useDeviceStore()
  const [form, setForm] = useState<Omit<Device, 'id'>>(emptyForm)

  function handleChange<K extends keyof Omit<Device, 'id'>>(key: K, value: Omit<Device, 'id'>[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleAdd() {
    addDevice(form)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-6">
      <div className="glass p-5 sm:p-6 space-y-4">
        <h2 className="h2">Add Device</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field">
            <span className="label">Name</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Category</span>
            <select
              className="input"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value as DeviceCategory)}
            >
              <option value="printer">Printer</option>
              <option value="dryer">Dryer</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="field">
            <span className="label">kWh per hour</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.kwhPerHour}
              onChange={(e) => handleChange('kwhPerHour', Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span className="label">Cost €/hour</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.costPerHour}
              onChange={(e) => handleChange('costPerHour', Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span className="label">Purchase price €</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', Number(e.target.value))}
            />
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          Save
        </button>
      </div>

      <div className="space-y-3">
        {devices.map((d) => (
          <div key={d.id} className="glass p-4 flex items-center gap-4">
            <div className="flex-1 text-sm">
              <div>
                {d.name} ({d.category})
              </div>
              <div className="muted">
                {d.kwhPerHour} kWh/h · € {d.costPerHour}/h · € {d.purchasePrice}
              </div>
            </div>
            <button className="btn" onClick={() => removeDevice(d.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
