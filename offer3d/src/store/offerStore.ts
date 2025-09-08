import { create } from 'zustand'
import type {
  OfferInput,
  OfferResult,
  FilamentItem,
  DeviceItem
} from '../types'
import { calculateOffer } from '../utils/pricing'

interface OfferState {
  input: OfferInput
  result: OfferResult
  updateField: <K extends keyof Omit<OfferInput, 'filaments' | 'devices'>>(
    key: K,
    value: OfferInput[K]
  ) => void
  addFilament: () => void
  updateFilament: <K extends keyof FilamentItem>(
    id: string,
    key: K,
    value: FilamentItem[K]
  ) => void
  removeFilament: (id: string) => void
  addDevice: () => void
  updateDevice: <K extends keyof DeviceItem>(
    id: string,
    key: K,
    value: DeviceItem[K]
  ) => void
  removeDevice: (id: string) => void
}

const initialInput: OfferInput = {
  filaments: [],
  devices: [],
  electricityCostPerKwh: 0,
  extraCost: 0,
  vatRate: 0.21
}

export const useOfferStore = create<OfferState>((set) => ({
  input: initialInput,
  result: calculateOffer(initialInput),
  updateField: (key, value) =>
    set((state) => {
      const input = { ...state.input, [key]: value }
      return { input, result: calculateOffer(input) }
    }),
  addFilament: () =>
    set((state) => {
      const input = {
        ...state.input,
        filaments: [
          ...state.input.filaments,
          { id: Math.random().toString(36).slice(2), grams: 0, costPerKg: 0 }
        ]
      }
      return { input, result: calculateOffer(input) }
    }),
  updateFilament: (id, key, value) =>
    set((state) => {
      const filaments = state.input.filaments.map((f) =>
        f.id === id ? { ...f, [key]: value } : f
      )
      const input = { ...state.input, filaments }
      return { input, result: calculateOffer(input) }
    }),
  removeFilament: (id) =>
    set((state) => {
      const filaments = state.input.filaments.filter((f) => f.id !== id)
      const input = { ...state.input, filaments }
      return { input, result: calculateOffer(input) }
    }),
  addDevice: () =>
    set((state) => {
      const input = {
        ...state.input,
        devices: [
          ...state.input.devices,
          { id: Math.random().toString(36).slice(2), name: '', electricityKwh: 0, cost: 0 }
        ]
      }
      return { input, result: calculateOffer(input) }
    }),
  updateDevice: (id, key, value) =>
    set((state) => {
      const devices = state.input.devices.map((d) =>
        d.id === id ? { ...d, [key]: value } : d
      )
      const input = { ...state.input, devices }
      return { input, result: calculateOffer(input) }
    }),
  removeDevice: (id) =>
    set((state) => {
      const devices = state.input.devices.filter((d) => d.id !== id)
      const input = { ...state.input, devices }
      return { input, result: calculateOffer(input) }
    })
}))
