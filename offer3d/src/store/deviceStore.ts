import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Device } from '../types'

interface DeviceState {
  devices: Device[]
  addDevice: (data: Omit<Device, 'id'>) => void
  updateDevice: <K extends keyof Device>(
    id: string,
    key: K,
    value: Device[K]
  ) => void
  removeDevice: (id: string) => void
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      devices: [],
      addDevice: (data) =>
        set((state) => ({
          devices: [...state.devices, { id: crypto.randomUUID(), ...data }]
        })),
      updateDevice: (id, key, value) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, [key]: value } : d
          )
        })),
      removeDevice: (id) =>
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id)
        }))
    }),
    {
      name: 'offer3d-devices',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
