import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Service } from '../types'

interface ServiceState {
  services: Service[]
  addService: (data: Omit<Service, 'id'>) => void
  updateService: <K extends keyof Service>(
    id: string,
    key: K,
    value: Service[K]
  ) => void
  removeService: (id: string) => void
}

export const useServiceStore = create<ServiceState>()(
  persist(
    (set) => ({
      services: [],
      addService: (data) =>
        set((state) => ({
          services: [...state.services, { id: crypto.randomUUID(), ...data }]
        })),
      updateService: (id, key, value) =>
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, [key]: value } : s
          )
        })),
      removeService: (id) =>
        set((state) => ({
          services: state.services.filter((s) => s.id !== id)
        }))
    }),
    {
      name: 'offer3d-services',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
