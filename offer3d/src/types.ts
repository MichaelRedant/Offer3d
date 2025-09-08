export interface FilamentItem {
  id: string
  grams: number
  costPerKg: number
}

export interface DeviceItem {
  id: string
  name: string
  electricityKwh: number
  cost: number
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
