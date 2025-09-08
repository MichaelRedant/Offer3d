import type { OfferInput, OfferResult } from '../types'

export function calculateOffer(input: OfferInput): OfferResult {
  const material = (input.filamentGrams / 1000) * input.filamentCostPerKg
  const energy = input.electricityKwh * input.electricityCostPerKwh
  const extra = input.extraCost
  const net = material + energy + extra
  const vat = net * input.vatRate
  const total = net + vat
  return { material, energy, extra, net, vat, total }
}
