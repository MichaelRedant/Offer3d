import { create } from 'zustand'
import type {
  OfferInput,
  OfferResult,
  FilamentItem,
  DeviceItem,
  Filament,
  Device,
  ServiceItem,
  Service
} from '../types'
import { calculateOffer } from '../utils/pricing'
import { fetchElectricityPrice as fetchEliaPrice } from '../utils/electricity'

interface OfferState {
  input: OfferInput
  result: OfferResult
  updateField: <K extends keyof Omit<OfferInput, 'filaments' | 'devices' | 'services'>>(
    key: K,
    value: OfferInput[K]
  ) => void
  addFilament: () => void
  updateFilament: <K extends keyof FilamentItem>(
    id: string,
    key: K,
    value: FilamentItem[K]
  ) => void
  setFilamentPreset: (id: string, filament: Filament, dryer?: Device) => void
  removeFilament: (id: string) => void
  addDevice: () => void
  updateDevice: <K extends keyof DeviceItem>(
    id: string,
    key: K,
    value: DeviceItem[K]
  ) => void
  setDevicePreset: (id: string, device: Device) => void
  setDeviceHours: (id: string, hours: number, device?: Device) => void
  removeDevice: (id: string) => void
  addService: () => void
  updateService: <K extends keyof ServiceItem>(
    id: string,
    key: K,
    value: ServiceItem[K]
  ) => void
  setServicePreset: (id: string, service: Service) => void
  setServiceHours: (id: string, hours: number) => void
  removeService: (id: string) => void
  fetchElectricityPrice: () => Promise<void>
}

const initialInput: OfferInput = {
  filaments: [],
  devices: [],
  services: [],
  electricityCostPerKwh: 0,
  extraCost: 0,
  profitMarginPct: 0,
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
          {
            id: Math.random().toString(36).slice(2),
            filamentId: undefined,
            grams: 0,
            costPerKg: 0
          }
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
  setFilamentPreset: (id, filament, dryer) =>
    set((state) => {
      const filaments = state.input.filaments.map((f) =>
        f.id === id
          ? {
              ...f,
              filamentId: filament.id,
              costPerKg:
                filament.pricePerKg * (1 + filament.markupPct / 100),
              dryingHours: filament.dryingTimeHours,
              dryerKwhPerHour: dryer?.kwhPerHour,
              dryerCostPerHour: dryer?.costPerHour
            }
          : f
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
          {
            id: Math.random().toString(36).slice(2),
            deviceId: undefined,
            name: '',
            hours: 0,
            electricityKwh: 0,
            cost: 0,
            purchasePrice: 0,
            purchasePct: 0
          }
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
  setDevicePreset: (id, device) =>
    set((state) => {
      const devices = state.input.devices.map((d) =>
        d.id === id
          ? {
              ...d,
              deviceId: device.id,
              name: device.name,
              hours: 0,
              electricityKwh: 0,
              cost: 0,
              purchasePrice: device.purchasePrice ?? 0,
              purchasePct: 0
            }
          : d
      )
      const input = { ...state.input, devices }
      return { input, result: calculateOffer(input) }
    }),
  setDeviceHours: (id, hours, device) =>
    set((state) => {
      const devices = state.input.devices.map((d) =>
        d.id === id
          ? {
              ...d,
              hours,
              electricityKwh: hours * (device?.kwhPerHour ?? 0),
              cost: hours * (device?.costPerHour ?? 0)
            }
          : d
      )
      const input = { ...state.input, devices }
      return { input, result: calculateOffer(input) }
    }),
  removeDevice: (id) =>
    set((state) => {
      const devices = state.input.devices.filter((d) => d.id !== id)
      const input = { ...state.input, devices }
      return { input, result: calculateOffer(input) }
    }),
  addService: () =>
    set((state) => {
      const input = {
        ...state.input,
        services: [
          ...state.input.services,
          {
            id: Math.random().toString(36).slice(2),
            serviceId: undefined,
            name: '',
            billing: 'hourly',
            hours: 0,
            rate: 0,
            cost: 0
          }
        ]
      }
      return { input, result: calculateOffer(input) }
    }),
  updateService: (id, key, value) =>
    set((state) => {
      const services = state.input.services.map((s) =>
        s.id === id ? { ...s, [key]: value } : s
      )
      const input = { ...state.input, services }
      return { input, result: calculateOffer(input) }
    }),
  setServicePreset: (id, service) =>
    set((state) => {
      const services = state.input.services.map((s) =>
        s.id === id
          ? {
              ...s,
              serviceId: service.id,
              name: service.name,
              billing: service.billing,
              rate: service.rate,
              hours: 0,
              cost: service.billing === 'fixed' ? service.rate : 0
            }
          : s
      )
      const input = { ...state.input, services }
      return { input, result: calculateOffer(input) }
    }),
  setServiceHours: (id, hours) =>
    set((state) => {
      const services = state.input.services.map((s) =>
        s.id === id
          ? { ...s, hours, cost: s.rate * hours }
          : s
      )
      const input = { ...state.input, services }
      return { input, result: calculateOffer(input) }
    }),
  removeService: (id) =>
    set((state) => {
      const services = state.input.services.filter((s) => s.id !== id)
      const input = { ...state.input, services }
      return { input, result: calculateOffer(input) }
    }),
  fetchElectricityPrice: async () => {
    const price = await fetchEliaPrice()
    set((state) => {
      const input = { ...state.input, electricityCostPerKwh: price }
      return { input, result: calculateOffer(input) }
    })
  }
}))
