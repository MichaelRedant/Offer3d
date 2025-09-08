export interface FilamentItem {
  id: string
  grams: number
  costPerKg: number
  dryingHours?: number
  dryerKwhPerHour?: number
  dryerCostPerHour?: number
}

export type DeviceCategory = 'printer' | 'dryer' | 'other'

export interface Filament {
  id: string
  brand: string
  material: string
  color: string
  pricePerKg: number
  markupPct: number
  dryerId?: string
  dryingTimeHours?: number
}

export interface Filament {
  id: string
  brand: string
  material: string
  color: string
  pricePerKg: number
  markupPct: number
}

export interface DeviceItem {
  id: string
  name: string
  electricityKwh: number
  cost: number
}

export interface Device {
  id: string
  name: string
  category: DeviceCategory
  kwhPerHour: number
  costPerHour: number
}

export interface OfferInput {
  filaments: FilamentItem[]
  devices: DeviceItem[]
  electricityCostPerKwh: number
  extraCost: number
  vatRate: number
}

export interface OfferResult {
  material: number
  energy: number
  equipment: number
  extra: number
  net: number
  vat: number
  total: number
}
