import { fetchElectricityPrice } from './electricity'
import { vi, expect, test } from 'vitest'

 test('converts imbalance price from €/MWh to €/kWh', async () => {
  const mockJson = { results: [{ imbalanceprice: 97 }] }
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => mockJson }) as unknown as typeof fetch
  const price = await fetchElectricityPrice()
  expect(price).toBe(0.097)
  expect(global.fetch).toHaveBeenCalled()
 })

 test('throws on invalid data', async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch
  await expect(fetchElectricityPrice()).rejects.toThrow()
 })
