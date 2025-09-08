import { describe, expect, it } from 'vitest'
import { calculateOffer } from './pricing'
import type { OfferInput } from '../types'

describe('calculateOffer', () => {
  it('computes totals including vat', () => {
    const input: OfferInput = {
      filamentGrams: 100,
      filamentCostPerKg: 25,
      electricityKwh: 2,
      electricityCostPerKwh: 0.5,
      extraCost: 10,
      vatRate: 0.21
    }

    const result = calculateOffer(input)
    expect(result.material).toBeCloseTo(2.5)
    expect(result.energy).toBeCloseTo(1)
    expect(result.net).toBeCloseTo(13.5)
    expect(result.vat).toBeCloseTo(2.835)
    expect(result.total).toBeCloseTo(16.335)
  })
})
