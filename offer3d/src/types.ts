export interface FilamentItem {
  id: string
  filamentId?: string
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

export interface DeviceItem {
  id: string
  deviceId?: string
  name: string
  hours: number
  electricityKwh: number
  cost: number
  purchasePrice: number
  purchasePct: number
}

export interface Device {
  id: string
  name: string
  category: DeviceCategory
  kwhPerHour: number
  costPerHour: number
  purchasePrice: number
}

export type ServiceBilling = 'hourly' | 'fixed'

export interface ServiceItem {
  id: string
  serviceId?: string
  name: string
  billing: ServiceBilling
  hours: number
  rate: number
  cost: number
}

export interface Service {
  id: string
  name: string
  billing: ServiceBilling
  rate: number
}

export interface OfferInput {
  filaments: FilamentItem[]
  devices: DeviceItem[]
  services: ServiceItem[]
  electricityCostPerKwh: number
  extraCost: number
  profitMarginPct: number
  vatRate: number
}

export interface OfferResult {
  material: number
  energy: number
  equipment: number
  services: number
  extra: number
  purchase: number
  profit: number
  net: number
  vat: number
  total: number
}
