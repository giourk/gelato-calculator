import { describe, it, expect } from 'vitest'
import { calcBatchSummary } from '../src/utils/calculations.js'
import { STAB_PRESETS } from '../src/utils/constants.js'

// BASE_INPUT: milk/cream in litres, everything else in grams.
// Expected outputs were computed by hand from the gelato_pro_v6.html source formulas:
//   - MSNF formula: 8.6 - (fatPct - 3.5) * 0.098
//   - Lactose: baseMSNF * 0.545
//   - Dextrose dry matter: qty * 0.91
//   - Glucose dry matter: qty * 0.95
//   - Batch is normalised to batchBase = 5000 g via sf = 5000 / totalBaseFull
//   - PAC/POD computed as % of batchBase, then carried forward
//
// With milk=41 L (×1.032 kg/L→42312 g), cream=8 L (×1.007→8056 g):
//   PAC ≈ 18.88   POD ≈ 16.20   Fat ≈ 6.89%   MSNF ≈ 8.54%   TS ≈ 32.39%

const BASE_INPUT = {
  sorbetMode: false,
  milk: 41, milkFat: 3.5,
  cream: 8, creamFat: 35,
  smp: 1300,
  sucrose: 8300,
  dextrose: 1100,
  glucose: 1300,
  stab: { ...STAB_PRESETS.base50c, qty: 50 },
  bDex: 0, bGluc: 0,
  advancedSugars: [],
  pastes: [],
  proIngredients: [],
  costs: { milk: 0.70, cream: 2.50, smp: 3.50, sucrose: 0.90, dextrose: 1.20, glucose: 1.10, bdex: 1.20, bgluc: 1.10 },
  cocoa: 0, alcohol: 0, alcAbv: 0,
}

describe('calcBatchSummary', () => {
  it('computes PAC within 0.5 of expected', () => {
    const result = calcBatchSummary(BASE_INPUT)
    expect(result.pac).toBeCloseTo(18.88, 0)
  })
  it('computes POD within 0.5 of expected', () => {
    const result = calcBatchSummary(BASE_INPUT)
    expect(result.pod).toBeCloseTo(16.20, 0)
  })
  it('computes fat% within 0.1 of expected', () => {
    const result = calcBatchSummary(BASE_INPUT)
    expect(result.fatPct).toBeCloseTo(6.89, 1)
  })
  it('computes total solids within 0.5 of expected', () => {
    const result = calcBatchSummary(BASE_INPUT)
    expect(result.totalSolids).toBeCloseTo(32.39, 0)
  })
  it('computes MSNF within 0.1 of expected', () => {
    const result = calcBatchSummary(BASE_INPUT)
    expect(result.msnf).toBeCloseTo(8.54, 1)
  })
})
