import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { calcBatchSummary } from '../utils/calculations.js'
import { STAB_PRESETS, PRO_INGREDIENTS } from '../utils/constants.js'

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
    proIngredients.value.push({ ...def, qty: 0, cost: def.defaultCost })
  }
  function removeProIngredient(i) { proIngredients.value.splice(i, 1) }

  // ── Pro Υλικά (cocoa & alcohol) ───────────────────────────────────────
  const proSpecial = reactive({ cocoa: 0, cCocoaCost: 0, alcohol: 0, alcAbv: 0 })

  // ── Selling prices (costs) ────────────────────────────────────────────
  const costs = reactive({
    milk: 0.70, cream: 2.50, smp: 3.50,
    sucrose: 0.90, dextrose: 1.20, glucose: 1.10,
    bdex: 1.20, bgluc: 1.10,
    sorbetWater: 0,
  })

  // ── Computed results ──────────────────────────────────────────────────
  const results = computed(() => calcBatchSummary({
    sorbetMode: sorbetMode.value,
    milk:       dairy.milk,
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
  }))

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

  function deleteRecipe(id) {
    const lib = getLibrary().filter(r => r.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))
  }

  return {
    // state
    sorbetMode, displayTemp, flavorName,
    dairy, sugars, advancedSugars, stab, batchAdditions, overrun,
    pastes, proIngredients, proSpecial, costs,
    // actions
    setStabPreset, addPaste, removePaste, addProIngredient, removeProIngredient,
    saveRecipe, loadRecipe, deleteRecipe, getLibrary,
    // computed
    results,
  }
})
