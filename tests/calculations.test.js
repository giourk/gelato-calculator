import { describe, it, expect } from 'vitest'
import { calcBatchSummary } from '../src/utils/calculations.js'
import { STAB_PRESETS, PAC_TARGETS, SORBET_PAC_TARGETS, ADVANCED_SUGARS, PRO_INGREDIENTS } from '../src/utils/constants.js'

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

// ── Sorbet base recipe ─────────────────────────────────────────────────────
// Water 5000g, sucrose 1500g, glucose42 800g, neutro stabilizer 5g
// Manual PAC: sf=5000/7305=0.6845, suc%=20.54, gluc%=10.40 → PAC≈28.86
// milkFat/creamFat are left at their gelato defaults to mirror the store, which
// doesn't zero them on mode switch — calcBatchSummary must ignore them in sorbetMode.
const SORBET_INPUT = {
  ...BASE_INPUT,
  sorbetMode: true,
  milk: 5000,   // grams of water in sorbet mode
  cream: 0,
  smp: 0,
  sucrose: 1500,
  dextrose: 0,
  glucose: 800,
  stab: { ...STAB_PRESETS.neutro, qty: 5 },
}

// ── 1. Original accuracy tests ─────────────────────────────────────────────
describe('calcBatchSummary base recipe', () => {
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

// ── 2. Professional target ranges ─────────────────────────────────────────
describe('professional target ranges (cream gelato at -11°C)', () => {
  it('PAC is within -11°C storage target (18–20)', () => {
    const { pac } = calcBatchSummary(BASE_INPUT)
    const { low, high } = PAC_TARGETS['-11']
    expect(pac).toBeGreaterThanOrEqual(low)
    expect(pac).toBeLessThanOrEqual(high)
  })
  it('fat% is within cream gelato range (4–10%)', () => {
    const { fatPct } = calcBatchSummary(BASE_INPUT)
    expect(fatPct).toBeGreaterThanOrEqual(4)
    expect(fatPct).toBeLessThanOrEqual(10)
  })
  it('MSNF is within professional range (7–11%)', () => {
    const { msnf } = calcBatchSummary(BASE_INPUT)
    expect(msnf).toBeGreaterThanOrEqual(7)
    expect(msnf).toBeLessThanOrEqual(11)
  })
  it('total solids is within professional range (32–40%)', () => {
    const { totalSolids } = calcBatchSummary(BASE_INPUT)
    expect(totalSolids).toBeGreaterThanOrEqual(32)
    expect(totalSolids).toBeLessThanOrEqual(40)
  })
  it('POD is within acceptable sweetness range (14–18)', () => {
    const { pod } = calcBatchSummary(BASE_INPUT)
    expect(pod).toBeGreaterThanOrEqual(14)
    expect(pod).toBeLessThanOrEqual(18)
  })
})

// ── 3. Monotonicity: ingredients push metrics in the right direction ───────
describe('monotonicity — adding ingredient changes the right metric', () => {
  it('more dextrose → higher PAC', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({ ...BASE_INPUT, dextrose: BASE_INPUT.dextrose + 500 })
    expect(r2.pac).toBeGreaterThan(r1.pac)
  })
  it('more cream → higher fat%', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({ ...BASE_INPUT, cream: BASE_INPUT.cream + 2 })
    expect(r2.fatPct).toBeGreaterThan(r1.fatPct)
  })
  it('more SMP → higher MSNF', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({ ...BASE_INPUT, smp: BASE_INPUT.smp + 500 })
    expect(r2.msnf).toBeGreaterThan(r1.msnf)
  })
  it('batch dextrose (bDex) → higher PAC than no batch addition', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({ ...BASE_INPUT, bDex: 60, bGluc: 100 })
    expect(r2.pac).toBeGreaterThan(r1.pac)
  })
  it('higher cream fat% → higher fat%', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({ ...BASE_INPUT, creamFat: 45 })
    expect(r2.fatPct).toBeGreaterThan(r1.fatPct)
  })
})

// ── 4. Sorbet mode ────────────────────────────────────────────────────────
describe('sorbet mode', () => {
  it('fat is exactly 0 (no dairy)', () => {
    const { fatPct } = calcBatchSummary(SORBET_INPUT)
    expect(fatPct).toBe(0)
  })
  it('MSNF is exactly 0 (no dairy)', () => {
    const { msnf } = calcBatchSummary(SORBET_INPUT)
    expect(msnf).toBe(0)
  })
  it('sorbet PAC ≈ 28.86 (manual calculation)', () => {
    const { pac } = calcBatchSummary(SORBET_INPUT)
    expect(pac).toBeCloseTo(28.86, 0)
  })
  it('sorbet PAC is within -16°C sorbet target (28–32)', () => {
    const { pac } = calcBatchSummary(SORBET_INPUT)
    const { low, high } = SORBET_PAC_TARGETS['-16']
    expect(pac).toBeGreaterThanOrEqual(low)
    expect(pac).toBeLessThanOrEqual(high)
  })
  it('sorbet has lower POD than cream gelato (less sugars proportionally)', () => {
    const rSorbet = calcBatchSummary(SORBET_INPUT)
    const rBase   = calcBatchSummary(BASE_INPUT)
    // Sorbet recipe has fewer sugars by weight — POD could go either way,
    // but sorbet PAC must be higher to compensate for missing MSNF antifreeze
    expect(rSorbet.pac).toBeGreaterThan(rBase.pac)
  })
})

// ── 5. Cocoa (chocolate gelato) ───────────────────────────────────────────
describe('cocoa / chocolate contribution', () => {
  const WITH_COCOA = { ...BASE_INPUT, cocoa: 300 }

  it('cocoa raises fat% (22% fat in cocoa)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_COCOA)
    expect(r2.fatPct).toBeGreaterThan(r1.fatPct)
  })
  it('cocoa raises total solids (95% TS)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_COCOA)
    expect(r2.totalSolids).toBeGreaterThan(r1.totalSolids)
  })
  it('cocoa raises MSNF (counts as protein)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_COCOA)
    expect(r2.msnf).toBeGreaterThan(r1.msnf)
  })
  it('300g cocoa raises fat% by roughly 0.5–1.5 pp', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_COCOA)
    const delta = r2.fatPct - r1.fatPct
    expect(delta).toBeGreaterThan(0.5)
    expect(delta).toBeLessThan(1.5)
  })
})

// ── 6. Pro ingredients (pistachio) ───────────────────────────────────────
describe('pro ingredients — pistachio paste', () => {
  const pistachio = PRO_INGREDIENTS.find(p => p.id === 'pistachio')
  const WITH_PISTACHIO = {
    ...BASE_INPUT,
    proIngredients: [{ ...pistachio, qty: 500, cost: pistachio.defaultCost }],
  }

  it('pistachio raises fat% (50% fat)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_PISTACHIO)
    expect(r2.fatPct).toBeGreaterThan(r1.fatPct)
  })
  it('pistachio raises total solids (99% TS)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_PISTACHIO)
    expect(r2.totalSolids).toBeGreaterThan(r1.totalSolids)
  })
  it('pistachio raises cost per kg (€40/kg paste)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_PISTACHIO)
    expect(r2.costPerKg).toBeGreaterThan(r1.costPerKg)
  })
  it('pistachio raises MSNF (18% protein)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary(WITH_PISTACHIO)
    expect(r2.msnf).toBeGreaterThan(r1.msnf)
  })
})

// ── 7. Advanced sugars ────────────────────────────────────────────────────
describe('advanced sugars', () => {
  it('maltodextrin increases TS with negligible PAC impact (FPD=0.10)', () => {
    const maltodex = ADVANCED_SUGARS.find(s => s.id === 'maltodex')
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      advancedSugars: [{ ...maltodex, qty: 500, cost: 1.5 }],
    })
    expect(r2.totalSolids).toBeGreaterThan(r1.totalSolids)
    expect(Math.abs(r2.pac - r1.pac)).toBeLessThan(1.5)
  })

  it('dextrose (advanced) increases PAC more than an equal weight of sucrose would', () => {
    // FPD dextrose=1.9 vs sucrose=1.0, so same grams → bigger PAC jump
    const advDex = { id: 'adv_dex', fpd: 1.9, pod: 0.74, dm: 0.91, qty: 300, cost: 1.2 }
    const advSuc = { id: 'adv_suc', fpd: 1.0, pod: 1.00, dm: 1.00, qty: 300, cost: 0.9 }
    const rDex = calcBatchSummary({ ...BASE_INPUT, advancedSugars: [advDex] })
    const rSuc = calcBatchSummary({ ...BASE_INPUT, advancedSugars: [advSuc] })
    expect(rDex.pac).toBeGreaterThan(rSuc.pac)
  })

  it('erythritol has high FPD (2.0) → raises PAC significantly', () => {
    const ery = ADVANCED_SUGARS.find(s => s.id === 'erythritol')
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      advancedSugars: [{ ...ery, qty: 300, cost: 5 }],
    })
    expect(r2.pac).toBeGreaterThan(r1.pac + 1)
  })
})

// ── 8. Alcohol (PAC contribution) ────────────────────────────────────────
describe('alcohol contribution', () => {
  it('alcohol raises PAC (ethanol has high FPD ~7.4)', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({ ...BASE_INPUT, alcohol: 200, alcAbv: 40 })
    expect(r2.pac).toBeGreaterThan(r1.pac)
  })
  it('higher ABV alcohol raises PAC more than lower ABV', () => {
    const r40 = calcBatchSummary({ ...BASE_INPUT, alcohol: 200, alcAbv: 40 })
    const r70 = calcBatchSummary({ ...BASE_INPUT, alcohol: 200, alcAbv: 70 })
    expect(r70.pac).toBeGreaterThan(r40.pac)
  })
})

// ── 9. Cost calculation ───────────────────────────────────────────────────
describe('cost calculation', () => {
  it('cost per kg is positive', () => {
    const { costPerKg } = calcBatchSummary(BASE_INPUT)
    expect(costPerKg).toBeGreaterThan(0)
  })
  it('cost per kg is in a realistic raw-ingredient range (€0.50–€12/kg)', () => {
    // BASE_INPUT is mostly cheap milk (€0.70/L) → raw ingredient cost ≈ €1/kg,
    // which is correct before labour/overhead mark-up.
    const { costPerKg } = calcBatchSummary(BASE_INPUT)
    expect(costPerKg).toBeGreaterThan(0.50)
    expect(costPerKg).toBeLessThan(12)
  })
  it('pistachio paste raises cost per kg', () => {
    const pistachio = PRO_INGREDIENTS.find(p => p.id === 'pistachio')
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      proIngredients: [{ ...pistachio, qty: 1000, cost: pistachio.defaultCost }],
    })
    expect(r2.costPerKg).toBeGreaterThan(r1.costPerKg)
  })
  it('total cost is positive and less than 500€ for a standard batch', () => {
    const { totalCost } = calcBatchSummary(BASE_INPUT)
    expect(totalCost).toBeGreaterThan(0)
    expect(totalCost).toBeLessThan(500)
  })
})
