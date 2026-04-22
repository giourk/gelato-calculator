/**
 * Gelato batch calculation utilities.
 *
 * Formulas are derived directly from gelato_pro_v6.html calc() function.
 * The source normalises every ingredient to a batchBase = 5000 g batch
 * using a scale factor  sf = 5000 / totalBaseFull,  then expresses
 * PAC/POD/fat/MSNF/TS as percentages of that 5000 g base.
 *
 * Input units
 *   milk, cream  → litres  (converted to grams via density constants)
 *   all other ingredients → grams
 */

import { SUGAR_COEFFS, FPD_TO_POD } from './constants.js'

// ── Density constants (g per mL) ──────────────────────────────────────────
const MILK_DENSITY  = 1.032   // 1 L whole milk  ≈ 1032 g
const CREAM_DENSITY = 1.007   // 1 L cream       ≈ 1007 g

// The source always normalises to this batch size before computing percentages
const BATCH_BASE = 5000 // grams

// ── FPD → POD lookup with warning on unknown values ──────────────────────
// FPD_TO_POD covers all standard gelato FPD values. Library recipes imported
// from the legacy HTML app may carry non-standard values — warn so the
// developer can extend the table rather than silently using the fallback.
function podCoeffFor(fpd) {
  const key = String(fpd ?? '1.0')
  if (!(key in FPD_TO_POD)) {
    console.warn(`[gelato] Unknown FPD value "${key}": POD coefficient not in table, falling back to 0.80. Add it to FPD_TO_POD in constants.js.`)
    return 0.80
  }
  return FPD_TO_POD[key]
}

// ── MSNF helper (identical formula for milk and cream in v6 source) ────────
// Source: function milkMSNF(fatPct){ return Math.max(0, 8.6 - (fatPct - 3.5) * 0.098); }
//         function creamMSNF(fatPct){ return Math.max(0, 8.6 - (fatPct - 3.5) * 0.098); }
function dairyMSNFpct(fatPct) {
  return Math.max(0, 8.6 - (fatPct - 3.5) * 0.098)
}

/**
 * Compute all batch summary metrics from structured input.
 *
 * @param {object} input
 * @returns {{ pac, pod, fatPct, msnf, totalSolids, totalMassG, costPerKg, totalCost }}
 */
export function calcBatchSummary(input) {
  const {
    sorbetMode,
    milk, milkFat,
    cream, creamFat,
    smp,
    sucrose, dextrose, glucose,
    stab,
    bDex, bGluc,
    advancedSugars,
    pastes,
    proIngredients,
    costs,
    cocoa   = 0,
    alcohol = 0,
    alcAbv  = 0,
  } = input

  // ── Convert liquid volumes to grams ──────────────────────────────────────
  const milk_g  = sorbetMode ? milk  : milk  * MILK_DENSITY  * 1000
  const cream_g = sorbetMode ? 0     : cream * CREAM_DENSITY * 1000

  // ── MSNF percentages ─────────────────────────────────────────────────────
  const mMSNF_pct = sorbetMode ? 0 : dairyMSNFpct(milkFat)
  const cMSNF_pct = sorbetMode ? 0 : dairyMSNFpct(creamFat)

  // ── Scale factor: normalise inputs to a 5000 g batch ─────────────────────
  // (mirrors source:  const totalBaseFull = milk+cream+sucrose+dex+gluc+smp+stab.qty;
  //                   const sf = batchBase / totalBaseFull; )
  // SMP is a dairy ingredient — zero it out in sorbet mode so it does not
  // skew the scale factor or contribute MSNF/lactose to a sorbet recipe.
  const effectiveSmp  = sorbetMode ? 0 : smp
  const totalBaseFull = milk_g + cream_g + sucrose + dextrose + glucose + effectiveSmp + stab.qty
  const sf = BATCH_BASE / totalBaseFull

  // ── Fat (scaled) ─────────────────────────────────────────────────────────
  const mFat    = sorbetMode ? 0 : milk_g  * (milkFat  / 100) * sf
  const cFat    = sorbetMode ? 0 : cream_g * (creamFat / 100) * sf
  const baseFat = mFat + cFat

  // ── MSNF (scaled) ────────────────────────────────────────────────────────
  const mMSNF  = milk_g      * (mMSNF_pct / 100) * sf
  const cMSNF  = cream_g     * (cMSNF_pct / 100) * sf
  const sMSNF  = effectiveSmp * 0.96 * sf            // effectiveSmp = 0 in sorbet mode
  const baseMSNF = mMSNF + cMSNF + sMSNF

  // Lactose ≈ 54.5% of MSNF (source uses 0.545)
  const lactose = baseMSNF * 0.545

  // ── Sugars dry matter (scaled) ───────────────────────────────────────────
  const suc_g  = sucrose  * sf
  const dex_g  = dextrose * 0.91 * sf   // dextrose monohydrate: 91% dry
  const gluc_g = glucose  * 0.95 * sf   // dried glucose syrup:  95% dry

  // ── Stabilizer (scaled) ──────────────────────────────────────────────────
  const stabFpd  = parseFloat(stab.fpd)
  const stabIn   = stab.qty * sf
  const stabSug  = stabIn * (stab.sug  / 100)
  const stabProt = stabIn * (stab.prot / 100)
  const stabFat  = stabIn * (stab.fat  / 100)
  const stabTS   = stabIn * (stab.ts   / 100)
  const stabPod  = podCoeffFor(stab.fpd)

  // ── Base totals (5000 g normalised batch) ─────────────────────────────────
  const baseTS      = baseFat + baseMSNF + suc_g + dex_g + gluc_g + stabTS
  const baseFatTot  = baseFat + stabFat    // stabFat = 0 for base50c
  const baseMSNFTot = baseMSNF + stabProt  // stabProt = 0 for base50c

  // ── Batch additions (absolute grams — no sf applied) ─────────────────────
  const bdex_g   = bDex  * 0.91
  const bgluc_g  = bGluc * 0.95
  const batchTotal = BATCH_BASE + bDex + bGluc
  const batchTS    = baseTS + bdex_g + bgluc_g

  // ── PAC ──────────────────────────────────────────────────────────────────
  // Source computes % of batchBase (5000 g), multiplies by FPD coefficient
  const suc_pct    = suc_g   / BATCH_BASE * 100
  const dex_pct    = dex_g   / BATCH_BASE * 100
  const gluc_pct   = gluc_g  / BATCH_BASE * 100
  const lac_pct    = lactose / BATCH_BASE * 100
  const stabSugPct = stabSug / BATCH_BASE * 100

  const pac_base = suc_pct    * SUGAR_COEFFS.sucrose.fpd
                 + dex_pct    * SUGAR_COEFFS.dextrose.fpd
                 + gluc_pct   * SUGAR_COEFFS.glucose42.fpd
                 + lac_pct    * SUGAR_COEFFS.lactose.fpd
                 + stabSugPct * stabFpd

  const bdex_pct  = bdex_g  / batchTotal * 100
  const bgluc_pct = bgluc_g / batchTotal * 100
  const pac_batch = pac_base * (BATCH_BASE / batchTotal)
                  + bdex_pct  * SUGAR_COEFFS.dextrose.fpd
                  + bgluc_pct * SUGAR_COEFFS.glucose42.fpd

  // ── POD ──────────────────────────────────────────────────────────────────
  const pod_base = (
    suc_g   * SUGAR_COEFFS.sucrose.pod   +
    dex_g   * SUGAR_COEFFS.dextrose.pod  +
    gluc_g  * SUGAR_COEFFS.glucose42.pod +
    lactose * SUGAR_COEFFS.lactose.pod   +
    stabSug * stabPod
  ) / BATCH_BASE * 100

  const pod_batch = (
    pod_base * BATCH_BASE                          +
    bdex_g   * SUGAR_COEFFS.dextrose.pod  * 100   +
    bgluc_g  * SUGAR_COEFFS.glucose42.pod * 100
  ) / batchTotal

  // ── Advanced sugars ───────────────────────────────────────────────────────
  let advQtyTotal = 0
  let advDryTotal = 0, advPAC_add = 0, advPOD_add = 0, advTSTotal = 0, advCostTotal = 0

  const extBatchTotal_pre = batchTotal + advancedSugars.reduce((s, a) => s + (a.qty || 0), 0)

  for (const adv of advancedSugars) {
    if (!adv.qty || adv.qty <= 0) continue
    const dry = adv.qty * adv.dm
    advQtyTotal  += adv.qty
    advDryTotal  += dry
    advTSTotal   += dry
    advCostTotal += adv.qty / 1000 * (adv.cost ?? 0)
    advPAC_add   += (dry / extBatchTotal_pre) * adv.fpd * 100
    advPOD_add   += (dry / extBatchTotal_pre) * adv.pod * 100
  }

  const extBatchTotal  = batchTotal + advQtyTotal
  const extScaleFactor = extBatchTotal > 0 ? batchTotal / extBatchTotal : 1
  const extPAC         = pac_batch * extScaleFactor + advPAC_add
  const extPOD         = pod_batch * extScaleFactor + advPOD_add
  const extBatchTS     = batchTS + advTSTotal

  // ── Pastes + Pro ingredients ──────────────────────────────────────────────
  const totalPasteQty = pastes.reduce((s, p) => s + (p.qty || 0), 0)
                      + (cocoa || 0) + (alcohol || 0)
                      + proIngredients.reduce((s, p) => s + (p.qty || 0), 0)
  const finalTotal = extBatchTotal + totalPasteQty

  let pasteFat = 0, pasteProt = 0, pastePAC = 0, pastePOD = 0, pasteTS = 0, pasteCost = 0

  for (const p of pastes) {
    if (!p.qty || p.qty <= 0) continue
    const fpdVal   = parseFloat(p.fpd ?? '1.0')
    const podCoeff = podCoeffFor(p.fpd ?? '1.0')
    pasteFat  += p.qty * (p.fatPct  ?? p.fat  ?? 0) / 100
    pasteProt += p.qty * (p.protPct ?? p.prot ?? 0) / 100
    pasteTS   += p.qty * Math.min(
      (p.fatPct ?? p.fat ?? 0) + (p.carbPct ?? p.carb ?? 0) + (p.protPct ?? p.prot ?? 0), 97
    ) / 100
    const sug_g = p.qty * (p.sugPct ?? p.sug ?? p.sugars ?? 0) / 100
    pastePAC  += sug_g / finalTotal * fpdVal  * 100
    pastePOD  += sug_g / finalTotal * podCoeff * 100
    pasteCost += p.qty / 1000 * (p.cost ?? 0)
  }

  // Cocoa contribution
  pasteFat  += (cocoa || 0) * 0.22
  pasteProt += (cocoa || 0) * 0.20
  pasteTS   += (cocoa || 0) * 0.95

  // Alcohol contribution (PAC only)
  if (alcohol && alcAbv) {
    const ethanol_weight = alcohol * (alcAbv / 100) * 0.8
    pastePAC += (ethanol_weight * 7.4) / finalTotal * 100
  }

  // Pro ingredients
  let proCost = 0, proSugG = 0
  for (const pi of proIngredients) {
    if (!pi.qty || pi.qty <= 0) continue
    const fpdVal   = parseFloat(pi.fpd ?? '1.0')
    const podCoeff = podCoeffFor(pi.fpd ?? '1.0')
    const sug_g    = pi.qty * (pi.sug ?? pi.sugPct ?? 0) / 100
    pasteFat  += pi.qty * (pi.fat  ?? pi.fatPct  ?? 0) / 100
    pasteProt += pi.qty * (pi.prot ?? pi.protPct ?? 0) / 100
    pasteTS   += pi.qty * (pi.ts   ?? pi.tsPct   ?? 0) / 100
    proCost   += pi.qty / 1000 * (pi.cost ?? pi.defaultCost ?? 0)
    proSugG   += sug_g   // accumulate for addedSugarsPct
    if (fpdVal > 0) {
      pastePAC += sug_g / finalTotal * fpdVal   * 100
      pastePOD += sug_g / finalTotal * podCoeff * 100
    }
  }

  // ── Final metrics ─────────────────────────────────────────────────────────
  const finalFat  = (baseFatTot  + pasteFat)  / finalTotal * 100
  const finalMSNF = (baseMSNFTot + pasteProt)  / finalTotal * 100
  const finalTS   = (extBatchTS  + pasteTS)    / finalTotal * 100
  const finalPAC  = extPAC * (extBatchTotal / finalTotal) + pastePAC
  const finalPOD  = extPOD * (extBatchTotal / finalTotal) + pastePOD

  // ── Cost ──────────────────────────────────────────────────────────────────
  const liquidCost = sorbetMode
    ? milk_g / 1000 * (costs.sorbetWater ?? 0)
    : milk_g / 1000 * costs.milk + cream_g / 1000 * costs.cream + smp / 1000 * costs.smp

  const baseCost = liquidCost
    + sucrose  / 1000 * costs.sucrose
    + dextrose / 1000 * costs.dextrose
    + glucose  / 1000 * costs.glucose
    + stab.qty / 1000 * (stab.cost ?? 0)
    + bDex     / 1000 * (costs.bdex  ?? 0)
    + bGluc    / 1000 * (costs.bgluc ?? 0)

  // Note: baseCost is in real units (not scaled by sf), matching how source
  // computes: milk*sf/1000*c_milk — but sf cancels when we later do cost/kg
  // of the 5000 g batch. For the task we keep costs on actual input quantities.
  const totalCost = baseCost * sf + advCostTotal + pasteCost + proCost
  const costPerKg = totalCost / (finalTotal / 1000)

  // Added sugars % (sucrose + dextrose + glucose + batch additions + pastes + pro ingredients, excl. lactose)
  const addedSugarsG = suc_g + dex_g + gluc_g + bdex_g + bgluc_g
  const pasteSugG    = pastes.reduce((s, p) => s + (p.qty || 0) * (p.sugPct ?? p.sug ?? p.sugars ?? 0) / 100, 0)
  const addedSugarsPct = (addedSugarsG + pasteSugG + proSugG) / finalTotal * 100

  const realBatchMassG = totalBaseFull + bDex + bGluc + advQtyTotal + totalPasteQty
  const realTotalCost  = baseCost + advCostTotal + pasteCost + proCost

  return {
    pac:            finalPAC,
    pod:            finalPOD,
    fatPct:         finalFat,
    msnf:           finalMSNF,
    totalSolids:    finalTS,
    addedSugarsPct,
    totalMassG:     finalTotal,
    costPerKg,
    totalCost,
    realBatchMassG,
    realTotalCost,
  }
}

/**
 * Compute ice-structure metrics from PAC and serving temperature.
 *
 * Source: gelato_pro_v6.html v6.0 — empirical model from
 *   Lebesi & Tzia (2012), Marshall & Arbuckle "Ice Cream" 5th ed.
 *
 * Formulae:
 *   IFP (°C)        = -0.054 × PAC
 *   pctFrozen (%)   = clamp(0-100, (1 - |IFP| / |T_serve|) × 100)
 *   unfrozenWaterPct = (100 - TS%) × (1 - pctFrozen / 100)
 *
 * Texture guide at serving temp:
 *   > 93%: too hard (difficult service)
 *   86–93%: optimal
 *   78–86%: slightly soft (acceptable)
 *   < 78%: too soft (collapse risk)
 *
 * @param {number}        pac         — final PAC value from calcBatchSummary
 * @param {string|number} servingTemp — serving temp in °C (e.g. '-16' or -16)
 * @param {number}        totalSolids — TS% from calcBatchSummary
 * @returns {{ ifp, pctFrozen, unfrozenWaterPct }}
 */
export function calcIFPMetrics(pac, servingTemp, totalSolids) {
  const T   = typeof servingTemp === 'string' ? parseInt(servingTemp, 10) : servingTemp
  const ifp = -0.054 * pac
  const pctFrozen = Math.max(0, Math.min(100,
    (1 - Math.abs(ifp) / Math.abs(T)) * 100
  ))
  const unfrozenWaterPct = (100 - totalSolids) * (1 - pctFrozen / 100)
  return { ifp, pctFrozen, unfrozenWaterPct }
}
