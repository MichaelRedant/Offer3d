import { useState } from 'react'
import { useServiceStore } from './store/serviceStore'
import type { Service, ServiceBilling } from './types'

const emptyForm: Omit<Service, 'id'> = {
  name: '',
  billing: 'hourly',
  rate: 0
}

export default function ServiceScreen() {
  const { services, addService, removeService } = useServiceStore()
  const [form, setForm] = useState<Omit<Service, 'id'>>(emptyForm)

  function handleChange<K extends keyof Omit<Service, 'id'>>(key: K, value: Omit<Service, 'id'>[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleAdd() {
    addService(form)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-6">
      <div className="glass p-5 sm:p-6 space-y-4">
        <h2 className="h2">Add Service</h2>
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
            <span className="label">Billing</span>
            <select
              className="input"
              value={form.billing}
              onChange={(e) => handleChange('billing', e.target.value as ServiceBilling)}
            >
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>

          <label className="field">
            <span className="label">{form.billing === 'hourly' ? 'Price €/hour' : 'Price €'}</span>
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.rate}
              onChange={(e) => handleChange('rate', Number(e.target.value))}
            />
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          Save
        </button>
      </div>

      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.id} className="glass p-4 flex items-center gap-4">
            <div className="flex-1 text-sm">
              <div>{s.name}</div>
              <div className="muted">
                {s.billing === 'hourly'
                  ? `€ ${s.rate}/h`
                  : `€ ${s.rate} fixed`}
              </div>
            </div>
            <button className="btn" onClick={() => removeService(s.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
