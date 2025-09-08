import type { OfferInput, OfferResult } from '../types'

export function calculateOffer(input: OfferInput): OfferResult {
  const material = input.filaments.reduce(
    (sum, f) => sum + (f.grams / 1000) * f.costPerKg,
    0
  )
  const energy =
    input.devices.reduce((sum, d) => sum + d.electricityKwh, 0) *
    input.electricityCostPerKwh
  const equipment = input.devices.reduce((sum, d) => sum + d.cost, 0)
  const extra = input.extraCost
  const net = material + energy + equipment + extra
  const vat = net * input.vatRate
  const total = net + vat
  return { material, energy, equipment, extra, net, vat, total }
}
