import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { calcBatchSummary, calcIFPMetrics, calcWarnings } from '../utils/calculations.js'
import { STAB_PRESETS, PRO_INGREDIENTS, ADVANCED_SUGARS } from '../utils/constants.js'

// Default costs — mirrors constants.js values and store costs fields
const DEFAULT_COSTS = {
  milk:        0.70,
  cream:       2.50,
  smp:         3.50,
  sorbetWater: 0,
  sucrose:     0.90,
  dextrose:    1.20,
  glucose:     1.10,
  bdex:        1.20,
  bgluc:       1.10,
  // Advanced sugars (€/kg)
  trehalose:   4.00,
  invert:      2.50,
  fructose:    2.00,
  honey:       8.00,
  agave:       6.00,
  maltodex:    2.50,
  isomalt:     5.00,
  erythritol:  6.00,
  // Stab presets (€/kg)
  stab_base50c: 6.00,
  stab_base100: 4.50,
  stab_neutro:  12.00,
  stab_custom:  5.00,
  // Pro ingredients (€/kg) — keyed as pro_<id>
  pro_dark_choc:   8.00,
  pro_white_choc:  7.00,
  pro_milk_choc:   6.50,
  pro_hazelnut:    14.00,
  pro_pistachio:   40.00,
  pro_almond:      18.00,
  pro_peanut:      5.00,
  pro_egg_yolk:    5.00,
  pro_honey:       8.00,
  pro_tahini:      6.00,
  pro_caramel:     5.00,
  pro_nutella:     6.00,
  pro_speculoos:   7.00,
  pro_cream35:     2.50,
  pro_whole_milk:  0.70,
  pro_water:       0.00,
  pro_mascarpone:  5.00,
  pro_ricotta:     4.00,
  pro_yogurt:      1.50,
  pro_condensed:   3.00,
  pro_plant_cream: 3.00,
  pro_sucrose_ex:  0.90,
  pro_cocoa_butter:20.00,
  pro_whole_egg:   4.00,
  pro_fruit_puree: 3.00,
  // Special
  cocoa:       8.00,
  alcohol:     10.00,
  // Generic paste default
  paste:       15.00,
}

export const useCalculatorStore = defineStore('calculator', () => {
  // ── Mode ──────────────────────────────────────────────────────────────
  const sorbetMode = ref(false)
  const displayTemp = ref('-16')
  const flavorName = ref('')

  // ── Dairy ─────────────────────────────────────────────────────────────
  const dairy = reactive({ milk: 41, milkFat: 3.5, cream: 8, creamFat: 35, smp: 1300, sorbetWater: 0 })

  // ── Sugars ────────────────────────────────────────────────────────────
  const sugars = reactive({ sucrose: 8300, dextrose: 1100, glucose: 1300 })

  // Advanced sugars: array of { id, label, fpd, pod, dm, qty }
  const advancedSugars = ref([])

  // ── Stabilizer ────────────────────────────────────────────────────────
  const stab = reactive({ ...STAB_PRESETS.base50c, qty: 50 })
  function setStabPreset(key) {
    const p = STAB_PRESETS[key]
    if (!p) return
    Object.assign(stab, { ...p, qty: p.rec })
  }

  // ── Batch additions (absolute grams) ──────────────────────────────────
  const batchAdditions = reactive({ bDex: 60, bGluc: 100 })

  // ── Overrun ───────────────────────────────────────────────────────────
  const overrun = reactive({ pct: 30, mixDensity: 1.09 })

  // ── Pastes (dynamic rows) ─────────────────────────────────────────────
  const pastes = ref([])
  function addPaste() {
    pastes.value.push({ name: '', qty: 0, dosage: 0, sugars: 0, fat: 0, carbs: 0, prot: 0, ts: 0, fpd: '1.0', cost: 0 })
  }
  function removePaste(i) { pastes.value.splice(i, 1) }

  // ── Pro ingredients ───────────────────────────────────────────────────
  const proIngredients = ref([])
  function addProIngredient(id) {
    const def = PRO_INGREDIENTS.find(p => p.id === id)
    if (!def) return
    proIngredients.value.push({ ...def, qty: 0, cost: costDB[`pro_${id}`] ?? def.defaultCost })
  }
  function removeProIngredient(i) { proIngredients.value.splice(i, 1) }

  // ── Pro Υλικά (cocoa & alcohol) ───────────────────────────────────────
  const proSpecial = reactive({ cocoa: 0, cCocoaCost: 0, alcohol: 0, alcAbv: 0 })

  // ── Cost database (localStorage) ─────────────────────────────────────
  const COSTS_KEY = 'gelato_costs_v1'
  const costDB = reactive({ ...DEFAULT_COSTS, _savedAt: null })

  function loadCostDB() {
    try {
      const raw = localStorage.getItem(COSTS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        Object.assign(costDB, parsed)
      }
    } catch { /* ignore parse errors */ }
    // Seed the costs reactive from costDB
    costs.milk        = costDB.milk
    costs.cream       = costDB.cream
    costs.smp         = costDB.smp
    costs.sorbetWater = costDB.sorbetWater
    costs.sucrose     = costDB.sucrose
    costs.dextrose    = costDB.dextrose
    costs.glucose     = costDB.glucose
    costs.bdex        = costDB.bdex
    costs.bgluc       = costDB.bgluc
  }

  function saveCostDB() {
    const ts = new Date().toISOString()
    costDB._savedAt = ts
    // Sync costs reactive → costDB
    costDB.milk        = costs.milk
    costDB.cream       = costs.cream
    costDB.smp         = costs.smp
    costDB.sorbetWater = costs.sorbetWater
    costDB.sucrose     = costs.sucrose
    costDB.dextrose    = costs.dextrose
    costDB.glucose     = costs.glucose
    costDB.bdex        = costs.bdex
    costDB.bgluc       = costs.bgluc
    localStorage.setItem(COSTS_KEY, JSON.stringify({ ...costDB }))
  }

  function resetCostDB() {
    Object.assign(costDB, DEFAULT_COSTS, { _savedAt: null })
    localStorage.removeItem(COSTS_KEY)
    loadCostDB()
  }

  // ── Selling prices (costs) ────────────────────────────────────────────
  const costs = reactive({
    milk: 0.70, cream: 2.50, smp: 3.50,
    sucrose: 0.90, dextrose: 1.20, glucose: 1.10,
    bdex: 1.20, bgluc: 1.10,
    sorbetWater: 0,
  })

  // ── Computed results ─────────────────────────────────────────────────
  const results = computed(() => {
    const base = calcBatchSummary({
      sorbetMode: sorbetMode.value,
      milk:       sorbetMode.value ? dairy.sorbetWater : dairy.milk,
      milkFat:    dairy.milkFat,
      cream:      dairy.cream,
      creamFat:   dairy.creamFat,
      smp:        dairy.smp,
      sucrose:    sugars.sucrose,
      dextrose:   sugars.dextrose,
      glucose:    sugars.glucose,
      stab:       { ...stab },
      bDex:       batchAdditions.bDex,
      bGluc:      batchAdditions.bGluc,
      advancedSugars: advancedSugars.value,
      pastes:     pastes.value,
      proIngredients: proIngredients.value,
      costs:      { ...costs },
      cocoa:      proSpecial.cocoa,
      alcohol:    proSpecial.alcohol,
      alcAbv:     proSpecial.alcAbv,
    })
    const ifp = calcIFPMetrics(base.pac, displayTemp.value, base.totalSolids)
    return { ...base, ...ifp }
  })

  const warnings = computed(() =>
    calcWarnings(results.value, displayTemp.value, sorbetMode.value)
  )

  // ── Library (localStorage) ────────────────────────────────────────────
  const STORAGE_KEY = 'gelato_lib_v60'

  function getLibrary() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
    catch { return [] }
  }

  function saveRecipe(name) {
    const lib = getLibrary()
    lib.push({
      id: Date.now(),
      name,
      date: new Date().toLocaleDateString('el-GR'),
      summary: {
        pac:         results.value.pac,
        fatPct:      results.value.fatPct,
        totalSolids: results.value.totalSolids,
      },
      sorbetMode:     sorbetMode.value,
      displayTemp:    displayTemp.value,
      flavorName:     flavorName.value,
      dairy:          { ...dairy },
      sugars:         { ...sugars },
      advancedSugars: advancedSugars.value,
      stab:           { ...stab },
      batchAdditions: { ...batchAdditions },
      overrun:        { ...overrun },
      pastes:         pastes.value,
      proIngredients: proIngredients.value,
      proSpecial:     { ...proSpecial },
      costs:          { ...costs },
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))
  }

  function loadRecipe(entry) {
    sorbetMode.value  = entry.sorbetMode ?? false
    displayTemp.value = entry.displayTemp ?? '-16'
    flavorName.value  = entry.flavorName ?? ''
    Object.assign(dairy,          entry.dairy          ?? {})
    Object.assign(sugars,         entry.sugars         ?? {})
    advancedSugars.value        = entry.advancedSugars ?? []
    Object.assign(stab,           entry.stab           ?? {})
    Object.assign(batchAdditions, entry.batchAdditions ?? {})
    Object.assign(overrun,        entry.overrun        ?? {})
    pastes.value         = entry.pastes         ?? []
    proIngredients.value = entry.proIngredients ?? []
    Object.assign(proSpecial, entry.proSpecial ?? {})
    Object.assign(costs,      entry.costs      ?? {})
  }

  function scaleRecipe(targetKg) {
    if (!targetKg || targetKg <= 0) return
    const currentMassG = results.value.realBatchMassG
    if (!currentMassG || currentMassG <= 0) return
    const sf = (targetKg * 1000) / currentMassG

    dairy.milk          = +(dairy.milk          * sf).toFixed(2)
    dairy.cream         = +(dairy.cream         * sf).toFixed(2)
    dairy.smp           = Math.round(dairy.smp           * sf)
    dairy.sorbetWater   = Math.round(dairy.sorbetWater   * sf)
    sugars.sucrose      = Math.round(sugars.sucrose      * sf)
    sugars.dextrose     = Math.round(sugars.dextrose     * sf)
    sugars.glucose      = Math.round(sugars.glucose      * sf)
    stab.qty            = Math.round(stab.qty            * sf)
    batchAdditions.bDex  = Math.round(batchAdditions.bDex  * sf)
    batchAdditions.bGluc = Math.round(batchAdditions.bGluc * sf)
    for (const a of advancedSugars.value)  a.qty = Math.round(a.qty * sf)
    for (const p of pastes.value)          p.qty = Math.round(p.qty * sf)
    for (const p of proIngredients.value)  p.qty = Math.round(p.qty * sf)
    proSpecial.cocoa    = Math.round(proSpecial.cocoa    * sf)
    proSpecial.alcohol  = Math.round(proSpecial.alcohol  * sf)
  }

  function deleteRecipe(id) {
    const lib = getLibrary().filter(r => r.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))
  }

  // ── Init: load persisted cost DB ──────────────────────────────────────
  loadCostDB()

  return {
    // state
    sorbetMode, displayTemp, flavorName,
    dairy, sugars, advancedSugars, stab, batchAdditions, overrun,
    pastes, proIngredients, proSpecial, costs,
    costDB, DEFAULT_COSTS,
    // actions
    setStabPreset, addPaste, removePaste, addProIngredient, removeProIngredient,
    saveRecipe, loadRecipe, deleteRecipe, getLibrary, scaleRecipe,
    loadCostDB, saveCostDB, resetCostDB,
    // computed
    results, warnings,
  }
})
