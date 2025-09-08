import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Filament } from '../types'

interface FilamentState {
  filaments: Filament[]
  addFilament: (data: Omit<Filament, 'id'>) => void
  updateFilament: <K extends keyof Filament>(
    id: string,
    key: K,
    value: Filament[K]
  ) => void
  removeFilament: (id: string) => void
}

export const useFilamentStore = create<FilamentState>()(
  persist(
    (set) => ({
      filaments: [],
      addFilament: (data) =>
        set((state) => ({
          filaments: [
            ...state.filaments,
            { id: crypto.randomUUID(), ...data }
          ]
        })),
      updateFilament: (id, key, value) =>
        set((state) => ({
          filaments: state.filaments.map((f) =>
            f.id === id ? { ...f, [key]: value } : f
          )
        })),
      removeFilament: (id) =>
        set((state) => ({
          filaments: state.filaments.filter((f) => f.id !== id)
        }))
    }),
    {
      name: 'offer3d-filaments',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
