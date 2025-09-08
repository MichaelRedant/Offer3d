import { describe, expect, it } from 'vitest'
import { calculateOffer } from './pricing'
import type { OfferInput } from '../types'

describe('calculateOffer', () => {
  it('computes totals including vat', () => {
    const input: OfferInput = {
      filaments: [
        { id: 'a', grams: 100, costPerKg: 25 },
        { id: 'b', grams: 50, costPerKg: 20 }
      ],
      devices: [
        { id: 'd1', name: 'dryer', electricityKwh: 2, cost: 1 },
        { id: 'd2', name: 'printer', electricityKwh: 3, cost: 0 }
      ],
      electricityCostPerKwh: 0.5,
      extraCost: 10,
      vatRate: 0.21
    }

    const result = calculateOffer(input)
    expect(result.material).toBeCloseTo(3.5)
    expect(result.energy).toBeCloseTo(2.5)
    expect(result.equipment).toBeCloseTo(1)
    expect(result.net).toBeCloseTo(17)
    expect(result.vat).toBeCloseTo(3.57)
    expect(result.total).toBeCloseTo(20.57)
  })
})
