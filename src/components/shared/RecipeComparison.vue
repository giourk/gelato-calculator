<template>
  <div class="card comparison-card">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
      <span>ΣΥΓΚΡΙΣΗ ΣΥΝΤΑΓΩΝ</span>
      <button @click="$emit('close')" style="background:#3a1a1a;color:var(--red);font-size:11px;padding:4px 8px;">✕ Κλείσιμο</button>
    </div>
    <div class="card-body" style="padding:0;">

      <!-- Recipe names header -->
      <div class="comp-header-row">
        <div class="col-metric"></div>
        <div class="col-a name-label">{{ recipeA.name }}</div>
        <div class="col-b name-label">{{ recipeB.name }}</div>
        <div class="col-delta" title="Διαφορά">Δ</div>
        <div class="col-range">Στόχος</div>
      </div>

      <!-- Section 1: Metrics -->
      <div class="section-title">ΜΕΤΡΙΚΕΣ</div>
      <div
        v-for="row in metricRows"
        :key="row.key"
        class="comp-row"
      >
        <div class="col-metric dim">{{ row.label }}</div>
        <div class="col-a value-cell">{{ row.valA }}</div>
        <div class="col-b value-cell">{{ row.valB }}</div>
        <div class="col-delta" :style="{ color: row.deltaColor }">{{ row.deltaStr }}</div>
        <div class="col-range dim">{{ row.range }}</div>
      </div>

      <!-- Section 2: Warnings diff -->
      <div class="section-title">ΠΡΟΕΙΔΟΠΟΙΗΣΕΙΣ</div>
      <div class="warnings-grid">
        <div class="warnings-panel">
          <div class="warnings-panel-title dim">{{ recipeA.name }}</div>
          <div
            v-if="warningsA.length === 0"
            style="color:var(--green);font-size:11px;"
          >Χωρίς προειδοποιήσεις</div>
          <div
            v-for="(w, i) in warningsA"
            :key="i"
            class="warning-item"
          >{{ w.message }}</div>
        </div>
        <div class="warnings-panel">
          <div class="warnings-panel-title dim">{{ recipeB.name }}</div>
          <div
            v-if="warningsB.length === 0"
            style="color:var(--green);font-size:11px;"
          >Χωρίς προειδοποιήσεις</div>
          <div
            v-for="(w, i) in warningsB"
            :key="i"
            class="warning-item"
          >{{ w.message }}</div>
        </div>
      </div>

      <!-- Section 3: Ingredient quantities -->
      <div class="section-title">ΠΟΣΟΤΗΤΕΣ ΣΥΣΤΑΤΙΚΩΝ</div>
      <div
        v-for="row in ingredientRows"
        :key="row.label"
        class="comp-row"
      >
        <div class="col-metric dim">{{ row.label }}</div>
        <div class="col-a value-cell">{{ row.valA }}</div>
        <div class="col-b value-cell">{{ row.valB }}</div>
        <div class="col-delta" :style="{ color: row.deltaColor }">{{ row.deltaStr }}</div>
        <div class="col-range dim">{{ row.unit }}</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { calcBatchSummary, calcIFPMetrics, calcWarnings } from '../../utils/calculations.js'
import { PAC_TARGETS, SORBET_PAC_TARGETS } from '../../utils/constants.js'

const props = defineProps({
  recipeA: { type: Object, required: true },
  recipeB: { type: Object, required: true },
})

defineEmits(['close'])

// ── Compute full results for each recipe ─────────────────────────────────────
function computeResults(entry) {
  const base = calcBatchSummary({
    sorbetMode:     entry.sorbetMode,
    milk:           entry.sorbetMode ? entry.dairy.sorbetWater : entry.dairy.milk,
    milkFat:        entry.dairy.milkFat,
    cream:          entry.dairy.cream,
    creamFat:       entry.dairy.creamFat,
    smp:            entry.dairy.smp,
    sucrose:        entry.sugars.sucrose,
    dextrose:       entry.sugars.dextrose,
    glucose:        entry.sugars.glucose,
    stab:           entry.stab,
    bDex:           entry.batchAdditions.bDex,
    bGluc:          entry.batchAdditions.bGluc,
    advancedSugars: entry.advancedSugars ?? [],
    pastes:         entry.pastes ?? [],
    proIngredients: entry.proIngredients ?? [],
    costs:          entry.costs ?? {},
    cocoa:          entry.proSpecial?.cocoa ?? 0,
    alcohol:        entry.proSpecial?.alcohol ?? 0,
    alcAbv:         entry.proSpecial?.alcAbv ?? 0,
  })
  const ifp = calcIFPMetrics(base.pac, entry.displayTemp, base.totalSolids)
  return { ...base, ...ifp }
}

const resultsA = computed(() => computeResults(props.recipeA))
const resultsB = computed(() => computeResults(props.recipeB))

const warningsA = computed(() =>
  calcWarnings(resultsA.value, props.recipeA.displayTemp, props.recipeA.sorbetMode)
)
const warningsB = computed(() =>
  calcWarnings(resultsB.value, props.recipeB.displayTemp, props.recipeB.sorbetMode)
)

// ── Delta color helpers ───────────────────────────────────────────────────────
function midpoint(lo, hi) { return (lo + hi) / 2 }

function rangeColor(valA, valB, lo, hi) {
  const delta = valB - valA
  if (Math.abs(delta) < 0.1) return '#666666'
  const mid = midpoint(lo, hi)
  const distA = Math.abs(valA - mid)
  const distB = Math.abs(valB - mid)
  return distB < distA ? 'var(--green)' : 'var(--red)'
}

function costColor(delta) {
  if (Math.abs(delta) < 0.001) return '#666666'
  return delta < 0 ? 'var(--green)' : 'var(--red)'
}

function ifpColor(delta) {
  if (Math.abs(delta) < 0.1) return '#666666'
  return delta < 0 ? 'var(--green)' : 'var(--red)'
}

function ingredientDeltaColor(delta) {
  if (delta === 0) return '#666666'
  return delta < 0 ? 'var(--green)' : 'var(--red)'
}

// ── Metric rows ───────────────────────────────────────────────────────────────
const metricRows = computed(() => {
  const a = resultsA.value
  const b = resultsB.value
  const tempA = props.recipeA.displayTemp

  const rows = []

  // PAC — target range derived from recipe A's serving temp and sorbet mode
  const pacTargets = props.recipeA.sorbetMode ? SORBET_PAC_TARGETS : PAC_TARGETS
  const pacT = pacTargets[String(tempA)]
  const pacLo = pacT?.low ?? 260
  const pacHi = pacT?.high ?? 280
  const pacRangeStr = `${pacLo}–${pacHi}`
  const pacDelta = b.pac - a.pac
  rows.push({
    key: 'pac',
    label: `PAC (${tempA}°C)`,
    valA: a.pac.toFixed(1),
    valB: b.pac.toFixed(1),
    deltaStr: formatDelta(pacDelta, 1),
    deltaColor: rangeColor(a.pac, b.pac, pacLo, pacHi),
    range: pacRangeStr,
  })

  // POD
  const podDelta = b.pod - a.pod
  rows.push({
    key: 'pod',
    label: 'POD',
    valA: a.pod.toFixed(1),
    valB: b.pod.toFixed(1),
    deltaStr: formatDelta(podDelta, 1),
    deltaColor: rangeColor(a.pod, b.pod, 16, 22),
    range: '16–22',
  })

  // Fat%
  const fatDelta = b.fatPct - a.fatPct
  rows.push({
    key: 'fat',
    label: 'Λιπαρά %',
    valA: a.fatPct.toFixed(1) + '%',
    valB: b.fatPct.toFixed(1) + '%',
    deltaStr: formatDelta(fatDelta, 1),
    deltaColor: rangeColor(a.fatPct, b.fatPct, 6, 8),
    range: '6–8%',
  })

  // MSNF%
  const msnfDelta = b.msnf - a.msnf
  rows.push({
    key: 'msnf',
    label: 'MSNF %',
    valA: a.msnf.toFixed(1) + '%',
    valB: b.msnf.toFixed(1) + '%',
    deltaStr: formatDelta(msnfDelta, 1),
    deltaColor: rangeColor(a.msnf, b.msnf, 9, 11),
    range: '9–11%',
  })

  // Total Solids%
  const tsDelta = b.totalSolids - a.totalSolids
  rows.push({
    key: 'ts',
    label: 'Ολ. Στερεά %',
    valA: a.totalSolids.toFixed(1) + '%',
    valB: b.totalSolids.toFixed(1) + '%',
    deltaStr: formatDelta(tsDelta, 1),
    deltaColor: rangeColor(a.totalSolids, b.totalSolids, 36, 40),
    range: '36–40%',
  })

  // IFP
  const ifpA = a.ifp ?? 0
  const ifpB = b.ifp ?? 0
  const ifpDelta = ifpB - ifpA
  rows.push({
    key: 'ifp',
    label: 'IFP (°C)',
    valA: ifpA.toFixed(2),
    valB: ifpB.toFixed(2),
    deltaStr: formatDelta(ifpDelta, 2),
    deltaColor: ifpColor(ifpDelta),
    range: '—',
  })

  // Cost/kg
  const costDelta = b.costPerKg - a.costPerKg
  rows.push({
    key: 'cost',
    label: 'Κόστος/kg',
    valA: '€' + a.costPerKg.toFixed(2),
    valB: '€' + b.costPerKg.toFixed(2),
    deltaStr: formatDelta(costDelta, 2),
    deltaColor: costColor(costDelta),
    range: '—',
  })

  return rows
})

// ── Ingredient rows ───────────────────────────────────────────────────────────
function getVal(entry, key) {
  if (key === 'milk') return entry.sorbetMode ? 0 : (entry.dairy.milk ?? 0)
  if (key === 'sorbetWater') return entry.sorbetMode ? (entry.dairy.sorbetWater ?? 0) : 0
  if (key === 'cream') return entry.sorbetMode ? 0 : (entry.dairy.cream ?? 0)
  if (key === 'smp') return entry.sorbetMode ? 0 : (entry.dairy.smp ?? 0)
  if (key === 'sucrose') return entry.sugars.sucrose ?? 0
  if (key === 'dextrose') return entry.sugars.dextrose ?? 0
  if (key === 'glucose') return entry.sugars.glucose ?? 0
  if (key === 'stab') return entry.stab?.qty ?? 0
  if (key === 'bDex') return entry.batchAdditions?.bDex ?? 0
  if (key === 'bGluc') return entry.batchAdditions?.bGluc ?? 0
  if (key === 'cocoa') return entry.proSpecial?.cocoa ?? 0
  if (key === 'alcohol') return entry.proSpecial?.alcohol ?? 0
  return 0
}

const ingredientRows = computed(() => {
  const a = props.recipeA
  const b = props.recipeB
  const rows = []

  function addRow(label, valA, valB, unit) {
    if (valA === 0 && valB === 0) return
    const delta = valB - valA
    rows.push({
      label,
      valA: formatQty(valA, unit),
      valB: formatQty(valB, unit),
      deltaStr: delta === 0 ? '—' : (delta > 0 ? '+' : '') + formatQty(delta, unit),
      deltaColor: ingredientDeltaColor(delta),
      unit,
    })
  }

  // Both blocks may fire when comparing a gelato (milk/cream/SMP) to a sorbet (water).
  // The addRow guard suppresses both-zero rows so each ingredient shows only where used.
  if (!a.sorbetMode || !b.sorbetMode) {
    addRow('Γάλα', getVal(a, 'milk'), getVal(b, 'milk'), 'L')
    addRow('Κρέμα', getVal(a, 'cream'), getVal(b, 'cream'), 'L')
    addRow('SMP', getVal(a, 'smp'), getVal(b, 'smp'), 'g')
  }
  if (a.sorbetMode || b.sorbetMode) {
    addRow('Νερό σορμπέ', getVal(a, 'sorbetWater'), getVal(b, 'sorbetWater'), 'g')
  }

  // Sugars
  addRow('Σακχαρόζη', getVal(a, 'sucrose'), getVal(b, 'sucrose'), 'g')
  addRow('Δεξτρόζη', getVal(a, 'dextrose'), getVal(b, 'dextrose'), 'g')
  addRow('Γλυκόζη', getVal(a, 'glucose'), getVal(b, 'glucose'), 'g')

  // Stab
  addRow('Σταθεροποιητής', getVal(a, 'stab'), getVal(b, 'stab'), 'g')

  // Batch additions
  addRow('Batch Dex', getVal(a, 'bDex'), getVal(b, 'bDex'), 'g')
  addRow('Batch Gluc', getVal(a, 'bGluc'), getVal(b, 'bGluc'), 'g')

  // Advanced sugars — union of labels
  const advLabels = new Map()
  for (const adv of (a.advancedSugars ?? [])) advLabels.set(adv.label, true)
  for (const adv of (b.advancedSugars ?? [])) advLabels.set(adv.label, true)
  for (const label of advLabels.keys()) {
    const aAdv = (a.advancedSugars ?? []).find(x => x.label === label)
    const bAdv = (b.advancedSugars ?? []).find(x => x.label === label)
    addRow(label, aAdv?.qty ?? 0, bAdv?.qty ?? 0, 'g')
  }

  // Pastes — union of names
  const pasteNames = new Map()
  for (const p of (a.pastes ?? [])) pasteNames.set(p.name, true)
  for (const p of (b.pastes ?? [])) pasteNames.set(p.name, true)
  for (const name of pasteNames.keys()) {
    const aP = (a.pastes ?? []).find(x => x.name === name)
    const bP = (b.pastes ?? []).find(x => x.name === name)
    addRow(name, aP?.qty ?? 0, bP?.qty ?? 0, 'g')
  }

  // Pro ingredients — union of labels
  const proLabels = new Map()
  for (const p of (a.proIngredients ?? [])) proLabels.set(p.label, true)
  for (const p of (b.proIngredients ?? [])) proLabels.set(p.label, true)
  for (const label of proLabels.keys()) {
    const aP = (a.proIngredients ?? []).find(x => x.label === label)
    const bP = (b.proIngredients ?? []).find(x => x.label === label)
    addRow(label, aP?.qty ?? 0, bP?.qty ?? 0, 'g')
  }

  // Pro special
  addRow('Κακάο', getVal(a, 'cocoa'), getVal(b, 'cocoa'), 'g')
  addRow('Αλκοόλ', getVal(a, 'alcohol'), getVal(b, 'alcohol'), 'g')

  return rows
})

// ── Formatters ────────────────────────────────────────────────────────────────
function formatDelta(val, decimals) {
  if (Math.abs(val) < Math.pow(10, -decimals) / 2) return '—'
  return (val > 0 ? '+' : '') + val.toFixed(decimals)
}

function formatQty(val, unit) {
  if (unit === 'L') return val.toFixed(3)
  return val.toFixed(1)
}
</script>

<style scoped>
.comparison-card { margin-top: 12px; }

.comp-header-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 0.6fr 0.8fr;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
}

.comp-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 0.6fr 0.8fr;
  gap: 4px;
  padding: 5px 12px;
  border-bottom: 1px solid #2a2a2a;
  align-items: center;
}
.comp-row:last-child { border-bottom: none; }

.col-metric { font-size: 11px; color: var(--text-dim); }
.col-a, .col-b { font-size: 11px; color: var(--text); text-align: center; }
.col-delta { font-size: 11px; text-align: center; font-weight: 600; }
.col-range { font-size: 10px; color: var(--text-dim); text-align: right; }

.name-label {
  font-size: 11px;
  color: var(--accent);
  font-weight: 700;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-cell { text-align: center; }

.section-title {
  padding: 5px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #555;
  background: var(--bg3);
  text-transform: uppercase;
  border-top: 1px solid var(--border);
}

.warnings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-bottom: 1px solid var(--border);
}

.warnings-panel {
  padding: 8px 12px;
  border-right: 1px solid #2a2a2a;
}
.warnings-panel:last-child { border-right: none; }

.warnings-panel-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warning-item {
  font-size: 10px;
  color: var(--orange);
  margin-bottom: 3px;
  line-height: 1.3;
}
</style>
