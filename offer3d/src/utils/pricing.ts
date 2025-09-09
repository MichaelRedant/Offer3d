import type { OfferInput, OfferResult } from '../types'

export function calculateOffer(input: OfferInput): OfferResult {
  const material = input.filaments.reduce(
    (sum, f) => sum + (f.grams / 1000) * f.costPerKg,
    0
  )
  const deviceEnergyKwh = input.devices.reduce(
    (sum, d) => sum + d.electricityKwh,
    0
  )
  const dryingEnergyKwh = input.filaments.reduce(
    (sum, f) =>
      sum + (f.dryingHours ?? 0) * (f.dryerKwhPerHour ?? 0),
    0
  )
  const energy =
    (deviceEnergyKwh + dryingEnergyKwh) * input.electricityCostPerKwh
  const equipment =
    input.devices.reduce((sum, d) => sum + d.cost, 0) +
    input.filaments.reduce(
      (sum, f) =>
        sum + (f.dryingHours ?? 0) * (f.dryerCostPerHour ?? 0),
      0
    )
  const extra = input.extraCost
  const base = material + energy + equipment + extra
  const profit = base * (input.profitMarginPct / 100)
  const purchase = input.devices.reduce(
    (sum, d) => sum + d.purchasePrice * (d.purchasePct / 100),
    0
  )
  const net = base + profit + purchase
  const vat = net * input.vatRate
  const total = net + vat
  return { material, energy, equipment, extra, profit, purchase, net, vat, total }
}
