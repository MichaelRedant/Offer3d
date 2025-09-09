import { describe, expect, it } from 'vitest'
import { calculateOffer } from './pricing'
import type { OfferInput } from '../types'

describe('calculateOffer', () => {
  it('computes totals including vat', () => {
    const input: OfferInput = {
      filaments: [
        {
          id: 'a',
          grams: 100,
          costPerKg: 25,
          dryingHours: 2,
          dryerKwhPerHour: 1,
          dryerCostPerHour: 0.5
        },
        { id: 'b', grams: 50, costPerKg: 20 }
      ],
      devices: [
        {
          id: 'd2',
          name: 'printer',
          electricityKwh: 3,
          cost: 2,
          purchasePrice: 100,
          purchasePct: 10
        }
      ],
      services: [],
      electricityCostPerKwh: 0.5,
      extraCost: 10,
      profitMarginPct: 10,
      vatRate: 0.21
    }

    const result = calculateOffer(input)
    expect(result.material).toBeCloseTo(3.5)
    expect(result.energy).toBeCloseTo(2.5)
    expect(result.equipment).toBeCloseTo(3)
    expect(result.profit).toBeCloseTo(1.9)
    expect(result.purchase).toBeCloseTo(10)
    expect(result.net).toBeCloseTo(30.9)
    expect(result.vat).toBeCloseTo(6.489)
    expect(result.total).toBeCloseTo(37.389)
  })
})
