export interface OfferInput {
  filamentGrams: number
  filamentCostPerKg: number
  electricityKwh: number
  electricityCostPerKwh: number
  extraCost: number
  vatRate: number
}

export interface OfferResult {
  material: number
  energy: number
  extra: number
  net: number
  vat: number
  total: number
}
