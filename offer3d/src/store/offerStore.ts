import { create } from 'zustand'
import { OfferInput, OfferResult } from '../types'
import { calculateOffer } from '../utils/pricing'

interface OfferState {
  input: OfferInput
  result: OfferResult
  update: <K extends keyof OfferInput>(key: K, value: OfferInput[K]) => void
}

const initialInput: OfferInput = {
  filamentGrams: 0,
  filamentCostPerKg: 0,
  electricityKwh: 0,
  electricityCostPerKwh: 0,
  extraCost: 0,
  vatRate: 0.21
}

export const useOfferStore = create<OfferState>((set) => ({
  input: initialInput,
  result: calculateOffer(initialInput),
  update: (key, value) =>
    set((state) => {
      const input = { ...state.input, [key]: value }
      return { input, result: calculateOffer(input) }
    })
}))
