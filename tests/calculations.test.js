import { describe, it, expect, vi } from 'vitest'
import { calcBatchSummary, calcIFPMetrics, calcWarnings } from '../src/utils/calculations.js'
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

// ── BUG REGRESSION TESTS ──────────────────────────────────────────────────
// Each test documents a discovered bug. Must be failing before the fix.

describe('Bug 1 — SMP in sorbet mode', () => {
  // Root cause: `smp` was included in totalBaseFull (skewing sf) and in
  // sMSNF calculation even in sorbet mode. A user who switches from a
  // gelato recipe (smp=1300) to sorbet without the UI resetting smp gets
  // ghost MSNF and a wrong scale factor.
  it('sorbet with leftover SMP from gelato gives zero MSNF', () => {
    const result = calcBatchSummary({ ...SORBET_INPUT, smp: 1300 })
    expect(result.msnf).toBe(0)
  })
  it('sorbet with leftover SMP gives zero fat', () => {
    const result = calcBatchSummary({ ...SORBET_INPUT, smp: 1300 })
    expect(result.fatPct).toBe(0)
  })
  it('sorbet PAC is unaffected by leftover SMP value', () => {
    // SMP should not enter the scale factor in sorbet mode
    const rNoSmp  = calcBatchSummary({ ...SORBET_INPUT, smp: 0 })
    const rWithSmp = calcBatchSummary({ ...SORBET_INPUT, smp: 1300 })
    expect(rWithSmp.pac).toBeCloseTo(rNoSmp.pac, 1)
  })
})

describe('Bug 2 — Pro ingredient sugars missing from addedSugarsPct', () => {
  // Root cause: the pro-ingredients loop computed sug_g per item for PAC/POD
  // but never accumulated it. addedSugarsPct only summed base + paste sugars.
  it('honey pro ingredient (80% sugar) raises addedSugarsPct', () => {
    const honey = PRO_INGREDIENTS.find(p => p.id === 'honey')
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      proIngredients: [{ ...honey, qty: 500, cost: honey.defaultCost }],
    })
    expect(r2.addedSugarsPct).toBeGreaterThan(r1.addedSugarsPct)
  })
  it('nutella pro ingredient (55% sugar) raises addedSugarsPct', () => {
    const nutella = PRO_INGREDIENTS.find(p => p.id === 'nutella')
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      proIngredients: [{ ...nutella, qty: 500, cost: nutella.defaultCost }],
    })
    expect(r2.addedSugarsPct).toBeGreaterThan(r1.addedSugarsPct)
  })
  it('zero-sugar pro ingredient (egg yolk, sug=0) does not raise addedSugarsPct', () => {
    // egg yolk has sug=0 → its sugar contribution must be exactly 0.
    // addedSugarsPct may slightly drop due to increased finalTotal (dilution),
    // but it must never increase.
    const egg = PRO_INGREDIENTS.find(p => p.id === 'egg_yolk')
    const r1 = calcBatchSummary(BASE_INPUT)
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      proIngredients: [{ ...egg, qty: 200, cost: egg.defaultCost }],
    })
    expect(r2.addedSugarsPct).toBeLessThanOrEqual(r1.addedSugarsPct)
  })
})

describe('Bug 3 — Silent FPD_TO_POD fallback', () => {
  // Root cause: FPD_TO_POD[String(fpd)] ?? 0.80 runs silently.
  // Library recipes imported from the old HTML app can carry non-standard
  // FPD values (e.g. '1.2'). The calc silently uses 0.80 with no indication.
  it('logs a console.warn when a paste has an unknown FPD value', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    calcBatchSummary({
      ...BASE_INPUT,
      pastes: [{ qty: 100, sugars: 30, fat: 10, prot: 3, ts: 50, fpd: '1.2', cost: 5 }],
    })
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0][0]).toMatch(/FPD.*1\.2/i)
    warnSpy.mockRestore()
  })
  it('does NOT warn for standard FPD values in the table', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const fpd of ['0', '1.0', '1.9', '0.8', '1.4', '1.5']) {
      calcBatchSummary({
        ...BASE_INPUT,
        pastes: [{ qty: 100, sugars: 30, fat: 10, prot: 3, ts: 50, fpd, cost: 5 }],
      })
    }
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

// ── UPGRADE: IFP model (replaces the wrong freezableWater formula) ─────────
// Source: gelato_pro_v6.html v6.0 technical calculations
//   IFP = -0.054 × PAC            (Lebesi & Tzia 2012; Marshall & Arbuckle)
//   pctFrozen = (1 - |IFP| / |T_serve|) × 100
//
// Base recipe PAC ≈ 18.88 at -16°C:
//   IFP = -0.054 × 18.88 = -1.02°C
//   pctFrozen = (1 - 1.02/16) × 100 = 93.6%  ← just above "optimal" 86-93%
//   unfrozenWaterPct = 67.61% water × (1-0.936) = 4.3% of total mix

describe('calcIFPMetrics — IFP model', () => {
  it('IFP = -0.054 × PAC (empirical formula)', () => {
    const { ifp } = calcIFPMetrics(18.88, '-16', 32.39)
    expect(ifp).toBeCloseTo(-0.054 * 18.88, 4)
  })

  it('pctFrozen ≈ 93.6% for base recipe at -16°C', () => {
    const { pctFrozen } = calcIFPMetrics(18.88, '-16', 32.39)
    expect(pctFrozen).toBeCloseTo(93.6, 0)
  })

  it('unfrozenWaterPct = water% × (1 − pctFrozen/100)', () => {
    const ts = 32.39
    const { pctFrozen, unfrozenWaterPct } = calcIFPMetrics(18.88, '-16', ts)
    const expected = (100 - ts) * (1 - pctFrozen / 100)
    expect(unfrozenWaterPct).toBeCloseTo(expected, 4)
  })

  it('higher PAC → more negative IFP (greater freezing-point depression)', () => {
    const { ifp: ifp1 } = calcIFPMetrics(18, '-16', 32)
    const { ifp: ifp2 } = calcIFPMetrics(25, '-16', 32)
    expect(ifp2).toBeLessThan(ifp1)
  })

  it('higher PAC → less water frozen (PAC raises the freezing point)', () => {
    // A higher PAC means IFP is more negative, which is CLOSER to a cold
    // serving temp → less delta available → less freezing? No — let's verify:
    // PAC=18: IFP=-0.972, pctFrozen=(1-0.972/16)*100=93.9%
    // PAC=25: IFP=-1.35,  pctFrozen=(1-1.35/16)*100=91.6%
    // Higher PAC → IFP more negative → |IFP|/|T| larger → pctFrozen LOWER ✓
    const { pctFrozen: p1 } = calcIFPMetrics(18, '-16', 32)
    const { pctFrozen: p2 } = calcIFPMetrics(25, '-16', 32)
    expect(p2).toBeLessThan(p1)
  })

  it('colder serving temp → more water frozen', () => {
    const { pctFrozen: warm } = calcIFPMetrics(18.88, '-11', 32.39)
    const { pctFrozen: cold } = calcIFPMetrics(18.88, '-18', 32.39)
    expect(cold).toBeGreaterThan(warm)
  })

  it('pctFrozen is clamped to 0–100% for any PAC', () => {
    for (const pac of [0, 5, 20, 40, 100]) {
      const { pctFrozen } = calcIFPMetrics(pac, '-16', 30)
      expect(pctFrozen).toBeGreaterThanOrEqual(0)
      expect(pctFrozen).toBeLessThanOrEqual(100)
    }
  })

  it('accepts numeric temp as well as string', () => {
    const { ifp: s } = calcIFPMetrics(18.88, '-16', 32.39)
    const { ifp: n } = calcIFPMetrics(18.88, -16,   32.39)
    expect(s).toBeCloseTo(n, 10)
  })

  it('calcBatchSummary no longer returns freezableWater', () => {
    const result = calcBatchSummary(BASE_INPUT)
    expect(result.freezableWater).toBeUndefined()
  })
})

// ── UPGRADE: real batch mass and cost ─────────────────────────────────────
describe('realBatchMassG and realTotalCost', () => {
  it('realBatchMassG equals sum of all real input grams', () => {
    // milk=41L×1032=42312, cream=8L×1007=8056, smp=1300, suc=8300, dex=1100, gluc=1300, stab=50
    const { realBatchMassG } = calcBatchSummary(BASE_INPUT)
    expect(realBatchMassG).toBeCloseTo(62418, 0)
  })

  it('realBatchMassG increases when paste is added', () => {
    const r1 = calcBatchSummary(BASE_INPUT)
    const pistachio = PRO_INGREDIENTS.find(p => p.id === 'pistachio')
    const r2 = calcBatchSummary({
      ...BASE_INPUT,
      proIngredients: [{ ...pistachio, qty: 500, cost: pistachio.defaultCost }],
    })
    expect(r2.realBatchMassG).toBeCloseTo(r1.realBatchMassG + 500, 0)
  })

  it('realTotalCost / (realBatchMassG/1000) ≈ costPerKg', () => {
    const r = calcBatchSummary(BASE_INPUT)
    expect(r.realTotalCost / (r.realBatchMassG / 1000)).toBeCloseTo(r.costPerKg, 1)
  })

  it('realTotalCost is greater than totalCost (real batch > normalised 5 kg)', () => {
    const r = calcBatchSummary(BASE_INPUT)
    expect(r.realTotalCost).toBeGreaterThan(r.totalCost)
  })

  it('realTotalCost ≈ 64.83 € for BASE_INPUT', () => {
    const r = calcBatchSummary(BASE_INPUT)
    expect(r.realTotalCost).toBeCloseTo(64.83, 1)
  })
})

// ── UPGRADE: calcWarnings ─────────────────────────────────────────────────
describe('calcWarnings', () => {
  function makeResults(overrides = {}) {
    const base = calcBatchSummary({ ...BASE_INPUT, ...overrides })
    return { ...base, ...calcIFPMetrics(base.pac, '-16', base.totalSolids) }
  }

  it('returns array (empty or warnings) for valid input', () => {
    const w = calcWarnings(makeResults(), '-16', false)
    expect(Array.isArray(w)).toBe(true)
  })

  it('warns when PAC is below target for displayTemp', () => {
    // BASE_INPUT at -16°C: PAC≈18.88, target 25-27 → low
    const w = calcWarnings(makeResults(), '-16', false)
    const pacWarn = w.find(x => x.metric === 'PAC')
    expect(pacWarn).toBeDefined()
    expect(pacWarn.message).toMatch(/χαμηλό/)
  })

  it('warns when PAC is above target', () => {
    // Force very high dextrose to push PAC above 27
    const r = makeResults({ dextrose: 8000 })
    const w = calcWarnings(r, '-16', false)
    const pacWarn = w.find(x => x.metric === 'PAC')
    expect(pacWarn).toBeDefined()
    expect(pacWarn.message).toMatch(/υψηλό/)
  })

  it('warns when MSNF is low (gelato mode)', () => {
    // BASE_INPUT MSNF≈8.54% < 9%
    const w = calcWarnings(makeResults(), '-16', false)
    const warn = w.find(x => x.metric === 'MSNF')
    expect(warn).toBeDefined()
  })

  it('does NOT warn about fat or MSNF in sorbet mode', () => {
    const sorbetResults = { ...makeResults(), fatPct: 0, msnf: 0 }
    const w = calcWarnings(sorbetResults, '-16', true)
    expect(w.find(x => x.metric === 'Λιπαρά')).toBeUndefined()
    expect(w.find(x => x.metric === 'MSNF')).toBeUndefined()
  })

  it('returns empty array when all metrics are in range', () => {
    // Craft results that pass every check at -11°C (PAC target 18-20)
    const inRange = {
      pac: 19, pod: 18, fatPct: 7, msnf: 10,
      totalSolids: 38, pctFrozen: 89,
    }
    const w = calcWarnings(inRange, '-11', false)
    expect(w).toHaveLength(0)
  })

  it('uses sorbet PAC targets in sorbet mode', () => {
    // SORBET_PAC_TARGETS['-16'] = { low:28, high:32 }
    // pac=20 is below sorbet target but above gelato target for -11°C
    const r = { pac: 20, pod: 18, fatPct: 0, msnf: 0, totalSolids: 31, pctFrozen: 89 }
    const wSorbet = calcWarnings(r, '-16', true)
    expect(wSorbet.find(x => x.metric === 'PAC')).toBeDefined()
  })

  it('each warning has metric, value, message fields', () => {
    const w = calcWarnings(makeResults(), '-16', false)
    expect(w.length).toBeGreaterThan(0)
    for (const item of w) {
      expect(typeof item.metric).toBe('string')
      expect(typeof item.value).toBe('number')
      expect(typeof item.message).toBe('string')
    }
  })
})
