<template>
  <div>
    <!-- Add to queue -->
    <div class="card">
      <div class="card-header">ΟΥΡΑ ΠΑΡΑΓΩΓΗΣ</div>
      <div class="card-body">
        <div style="display:flex;gap:8px;align-items:center;">
          <select
            v-model="selectedRecipeId"
            style="flex:1;background:#1a1a1a;border:1px solid #444;border-radius:6px;color:#ccc;padding:8px 10px;font-size:12px;"
          >
            <option value="" disabled>-- Επιλογή συνταγής --</option>
            <option
              v-for="entry in library"
              :key="entry.id"
              :value="entry.id"
            >{{ entry.name }}</option>
          </select>
          <button
            @click="addToQueue"
            :disabled="!selectedRecipeId"
            style="background:#1e3a5f;color:var(--blue);padding:8px 14px;font-size:12px;font-weight:700;border-radius:6px;white-space:nowrap;"
          >+ Προσθήκη</button>
        </div>
        <div v-if="library.length === 0" class="dim" style="margin-top:8px;font-size:11px;">
          Δεν υπάρχουν αποθηκευμένες συνταγές.
        </div>
      </div>
    </div>

    <!-- Queue list -->
    <div v-if="queue.length === 0" class="card">
      <div class="card-body" style="text-align:center;">
        <span class="dim" style="font-size:12px;">Η ουρά είναι άδεια. Προσθέστε συνταγές παραπάνω.</span>
      </div>
    </div>

    <div v-for="(item, idx) in queue" :key="item.recipeId + '-' + idx" class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <span style="display:flex;align-items:center;gap:8px;">
          <span style="color:#555;font-size:10px;">{{ idx + 1 }}.</span>
          <span>{{ item.recipeName }}</span>
          <span
            :style="{
              fontSize: '9px',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '3px',
              background: item.sorbetMode ? '#1a3a2a' : '#1a2a3a',
              color: item.sorbetMode ? 'var(--green)' : 'var(--blue)',
            }"
          >{{ item.sorbetMode ? 'SORBET' : 'ICE CREAM' }}</span>
        </span>
        <button
          @click="removeFromQueue(idx)"
          style="background:#3a1a1a;color:var(--red);padding:2px 8px;font-size:13px;font-weight:700;border-radius:4px;line-height:1;"
        >×</button>
      </div>
      <div class="card-body">
        <div class="row">
          <span class="label-text">Μέγεθος παρτίδας</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <input
              v-model.number="item.targetKg"
              type="number"
              min="0.1"
              step="0.5"
              style="width:70px;background:#111;border:1px solid #444;border-radius:5px;color:#fff;padding:5px 8px;font-size:13px;text-align:right;"
              @change="item.targetKg = Math.max(0.1, item.targetKg || 0.1)"
            />
            <span class="dim">kg</span>
          </div>
        </div>
        <div class="row">
          <span class="dim">Κόστος παρτίδας</span>
          <span style="color:var(--orange);font-size:13px;font-weight:700;">
            €{{ itemSummary(item).cost.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Summary footer -->
    <div v-if="queue.length > 0" class="card">
      <div class="card-header">ΣΥΝΟΛΟ ΗΜΕΡΑΣ</div>
      <div class="card-body">
        <div class="row">
          <span class="label-text">Σύνολο παραγωγής</span>
          <span style="color:var(--green);font-size:15px;font-weight:700;">{{ totalKg.toFixed(1) }} kg</span>
        </div>
        <div class="row" style="margin-bottom:0;">
          <span class="label-text">Συνολικό κόστος</span>
          <span style="color:var(--orange);font-size:15px;font-weight:700;">€{{ totalCost.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Aggregated ingredients (collapsible) -->
    <div v-if="queue.length > 0" class="card">
      <div
        class="card-header"
        style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
        @click="aggregateExpanded = !aggregateExpanded"
      >
        <span>ΣΥΝΟΛΙΚΑ ΥΛΙΚΑ</span>
        <span style="font-size:11px;color:#555;">{{ aggregateExpanded ? '▲ Σύμπτυξη' : '▼ Ανάπτυξη' }}</span>
      </div>
      <div v-if="aggregateExpanded" class="card-body">
        <!-- Dairy -->
        <template v-if="!allSorbet">
          <div class="agg-section-label">ΓΑΛΑΚΤΟΚΟΜΙΚΑ</div>
          <div v-if="aggregated.milk > 0" class="row agg-row">
            <span class="label-text">Γάλα</span>
            <span class="agg-val">{{ aggregated.milk.toFixed(2) }} L</span>
          </div>
          <div v-if="aggregated.cream > 0" class="row agg-row">
            <span class="label-text">Κρέμα</span>
            <span class="agg-val">{{ aggregated.cream.toFixed(2) }} L</span>
          </div>
          <div v-if="aggregated.smp > 0" class="row agg-row">
            <span class="label-text">SMP</span>
            <span class="agg-val">{{ aggregated.smp.toFixed(0) }} g</span>
          </div>
        </template>

        <!-- Sugars -->
        <div class="agg-section-label">ΣΑΚΧΑΡΑ</div>
        <div v-if="aggregated.sucrose > 0" class="row agg-row">
          <span class="label-text">Ζάχαρη</span>
          <span class="agg-val">{{ aggregated.sucrose.toFixed(0) }} g</span>
        </div>
        <div v-if="aggregated.dextrose > 0" class="row agg-row">
          <span class="label-text">Dextrose</span>
          <span class="agg-val">{{ aggregated.dextrose.toFixed(0) }} g</span>
        </div>
        <div v-if="aggregated.glucose > 0" class="row agg-row">
          <span class="label-text">Γλυκόζη 42DE</span>
          <span class="agg-val">{{ aggregated.glucose.toFixed(0) }} g</span>
        </div>
        <div v-if="aggregated.bDex > 0" class="row agg-row">
          <span class="label-text">Dextrose (batch)</span>
          <span class="agg-val">{{ aggregated.bDex.toFixed(0) }} g</span>
        </div>
        <div v-if="aggregated.bGluc > 0" class="row agg-row">
          <span class="label-text">Γλυκόζη (batch)</span>
          <span class="agg-val">{{ aggregated.bGluc.toFixed(0) }} g</span>
        </div>
        <template v-for="(qty, label) in aggregated.advSugars" :key="label">
          <div v-if="qty > 0" class="row agg-row">
            <span class="label-text">{{ label }}</span>
            <span class="agg-val">{{ qty.toFixed(0) }} g</span>
          </div>
        </template>

        <!-- Stabilizers -->
        <template v-if="Object.values(aggregated.stabs).some(q => q > 0)">
          <div class="agg-section-label">ΣΤΑΘΕΡΟΠΟΙΗΤΕΣ</div>
          <template v-for="(qty, label) in aggregated.stabs" :key="label">
            <div v-if="qty > 0" class="row agg-row">
              <span class="label-text">{{ label }}</span>
              <span class="agg-val">{{ qty.toFixed(0) }} g</span>
            </div>
          </template>
        </template>

        <!-- Pro / Pastes -->
        <template v-if="hasProSection">
          <div class="agg-section-label">PRO ΥΛΙΚΑ / ΠΕΣΤΕΣ</div>
          <template v-for="(qty, label) in aggregated.proIngredients" :key="label">
            <div v-if="qty > 0" class="row agg-row">
              <span class="label-text">{{ label }}</span>
              <span class="agg-val">{{ qty.toFixed(0) }} g</span>
            </div>
          </template>
          <template v-for="(qty, name) in aggregated.pastes" :key="name">
            <div v-if="qty > 0" class="row agg-row">
              <span class="label-text">{{ name }}</span>
              <span class="agg-val">{{ qty.toFixed(0) }} g</span>
            </div>
          </template>
          <div v-if="aggregated.cocoa > 0" class="row agg-row">
            <span class="label-text">Κακάο σκόνη</span>
            <span class="agg-val">{{ aggregated.cocoa.toFixed(0) }} g</span>
          </div>
          <div v-if="aggregated.alcohol > 0" class="row agg-row">
            <span class="label-text">Αλκοόλ</span>
            <span class="agg-val">{{ aggregated.alcohol.toFixed(0) }} g</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="queue.length > 0" class="card">
      <div class="card-body">
        <div style="display:flex;gap:8px;">
          <button
            @click="saveDay"
            style="flex:1;background:#1e3a5f;color:var(--blue);padding:10px;font-size:13px;font-weight:700;border-radius:6px;"
          >💾 Αποθήκευση ημέρας</button>
          <button
            @click="printPlan"
            style="flex:1;background:#1a3a1a;color:var(--green);padding:10px;font-size:13px;font-weight:700;border-radius:6px;"
          >🖨️ Print Plan</button>
        </div>
        <span v-if="saveFeedback" style="color:var(--green);font-size:11px;">{{ saveFeedback }}</span>
      </div>
    </div>

    <!-- Print sheet (hidden on screen, visible on print) -->
    <div class="production-print-sheet">
      <h2 style="margin:0 0 4px;">GELATO PRO — Πλάνο Παραγωγής</h2>
      <div style="font-size:12px;color:#666;margin-bottom:16px;">{{ printDate }}</div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="border-bottom:2px solid #000;">
            <th style="text-align:left;padding:4px 8px;font-size:12px;">#</th>
            <th style="text-align:left;padding:4px 8px;font-size:12px;">Συνταγή</th>
            <th style="text-align:left;padding:4px 8px;font-size:12px;">Τύπος</th>
            <th style="text-align:right;padding:4px 8px;font-size:12px;">Kg</th>
            <th style="text-align:right;padding:4px 8px;font-size:12px;">Κόστος</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in queue" :key="idx" style="border-bottom:1px solid #ddd;">
            <td style="padding:4px 8px;font-size:11px;">{{ idx + 1 }}</td>
            <td style="padding:4px 8px;font-size:11px;">{{ item.recipeName }}</td>
            <td style="padding:4px 8px;font-size:11px;">{{ item.sorbetMode ? 'SORBET' : 'ICE CREAM' }}</td>
            <td style="text-align:right;padding:4px 8px;font-size:11px;">{{ item.targetKg }}</td>
            <td style="text-align:right;padding:4px 8px;font-size:11px;">€{{ itemSummary(item).cost.toFixed(2) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #000;font-weight:700;">
            <td colspan="3" style="padding:4px 8px;font-size:12px;">ΣΥΝΟΛΟ</td>
            <td style="text-align:right;padding:4px 8px;font-size:12px;">{{ totalKg.toFixed(1) }} kg</td>
            <td style="text-align:right;padding:4px 8px;font-size:12px;">€{{ totalCost.toFixed(2) }}</td>
          </tr>
        </tfoot>
      </table>

      <h3 style="margin:0 0 8px;font-size:13px;border-bottom:1px solid #000;padding-bottom:4px;">ΛΙΣΤΑ ΑΓΟΡΩΝ</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          <template v-if="!allSorbet">
            <tr v-if="aggregated.milk > 0">
              <td style="padding:3px 8px;font-size:11px;">Γάλα</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.milk.toFixed(2) }} L</td>
            </tr>
            <tr v-if="aggregated.cream > 0">
              <td style="padding:3px 8px;font-size:11px;">Κρέμα</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.cream.toFixed(2) }} L</td>
            </tr>
            <tr v-if="aggregated.smp > 0">
              <td style="padding:3px 8px;font-size:11px;">SMP</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.smp.toFixed(0) }} g</td>
            </tr>
          </template>
          <tr v-if="aggregated.sucrose > 0">
            <td style="padding:3px 8px;font-size:11px;">Ζάχαρη</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.sucrose.toFixed(0) }} g</td>
          </tr>
          <tr v-if="aggregated.dextrose > 0">
            <td style="padding:3px 8px;font-size:11px;">Dextrose</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.dextrose.toFixed(0) }} g</td>
          </tr>
          <tr v-if="aggregated.glucose > 0">
            <td style="padding:3px 8px;font-size:11px;">Γλυκόζη 42DE</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.glucose.toFixed(0) }} g</td>
          </tr>
          <tr v-if="aggregated.bDex > 0">
            <td style="padding:3px 8px;font-size:11px;">Dextrose (batch)</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.bDex.toFixed(0) }} g</td>
          </tr>
          <tr v-if="aggregated.bGluc > 0">
            <td style="padding:3px 8px;font-size:11px;">Γλυκόζη (batch)</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.bGluc.toFixed(0) }} g</td>
          </tr>
          <template v-for="(qty, label) in aggregated.advSugars" :key="label">
            <tr v-if="qty > 0">
              <td style="padding:3px 8px;font-size:11px;">{{ label }}</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ qty.toFixed(0) }} g</td>
            </tr>
          </template>
          <template v-for="(qty, label) in aggregated.stabs" :key="label">
            <tr v-if="qty > 0">
              <td style="padding:3px 8px;font-size:11px;">{{ label }}</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ qty.toFixed(0) }} g</td>
            </tr>
          </template>
          <template v-for="(qty, label) in aggregated.proIngredients" :key="label">
            <tr v-if="qty > 0">
              <td style="padding:3px 8px;font-size:11px;">{{ label }}</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ qty.toFixed(0) }} g</td>
            </tr>
          </template>
          <template v-for="(qty, name) in aggregated.pastes" :key="name">
            <tr v-if="qty > 0">
              <td style="padding:3px 8px;font-size:11px;">{{ name }}</td>
              <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ qty.toFixed(0) }} g</td>
            </tr>
          </template>
          <tr v-if="aggregated.cocoa > 0">
            <td style="padding:3px 8px;font-size:11px;">Κακάο σκόνη</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.cocoa.toFixed(0) }} g</td>
          </tr>
          <tr v-if="aggregated.alcohol > 0">
            <td style="padding:3px 8px;font-size:11px;">Αλκοόλ</td>
            <td style="text-align:right;padding:3px 8px;font-size:11px;">{{ aggregated.alcohol.toFixed(0) }} g</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import { calcBatchSummary } from '../../utils/calculations.js'

const store = useCalculatorStore()

const PRODUCTION_KEY = 'gelato_production_v1'

const library = ref([])
const selectedRecipeId = ref('')
const queue = ref([])
const aggregateExpanded = ref(false)
const saveFeedback = ref('')

// ── Build calcBatchSummary input from a library entry ──────────────────

function buildInput(entry) {
  return {
    sorbetMode: entry.sorbetMode,
    milk:       entry.sorbetMode ? entry.dairy.sorbetWater : entry.dairy.milk,
    milkFat:    entry.dairy.milkFat,
    cream:      entry.dairy.cream,
    creamFat:   entry.dairy.creamFat,
    smp:        entry.dairy.smp,
    sucrose:    entry.sugars.sucrose,
    dextrose:   entry.sugars.dextrose,
    glucose:    entry.sugars.glucose,
    stab:       entry.stab,
    bDex:       entry.batchAdditions.bDex,
    bGluc:      entry.batchAdditions.bGluc,
    advancedSugars: entry.advancedSugars ?? [],
    pastes:     entry.pastes ?? [],
    proIngredients: entry.proIngredients ?? [],
    costs:      entry.costs ?? {},
    cocoa:      entry.proSpecial?.cocoa ?? 0,
    alcohol:    entry.proSpecial?.alcohol ?? 0,
    alcAbv:     entry.proSpecial?.alcAbv ?? 0,
  }
}

// ── Batch summary (cost + scale factor) for a single queue item ───────

function itemSummary(item) {
  const summary = calcBatchSummary(buildInput(item.entry))
  const sf = (summary.realBatchMassG > 0 && item.targetKg > 0)
    ? (item.targetKg * 1000) / summary.realBatchMassG
    : 0
  return { sf, cost: summary.realTotalCost * sf }
}

// ── Computed totals ────────────────────────────────────────────────────

const totalKg = computed(() => queue.value.reduce((s, item) => s + (item.targetKg || 0), 0))

const totalCost = computed(() => queue.value.reduce((s, item) => s + itemSummary(item).cost, 0))

const allSorbet = computed(() => queue.value.length > 0 && queue.value.every(i => i.sorbetMode))

// ── Aggregated ingredients ─────────────────────────────────────────────

const aggregated = computed(() => {
  const result = {
    milk: 0, cream: 0, smp: 0,
    sucrose: 0, dextrose: 0, glucose: 0, bDex: 0, bGluc: 0,
    advSugars: {},
    stabs: {},
    proIngredients: {},
    pastes: {},
    cocoa: 0, alcohol: 0,
  }

  for (const item of queue.value) {
    const sf = itemSummary(item).sf
    if (sf <= 0) continue
    const e = item.entry

    // Dairy (gelato only)
    if (!e.sorbetMode) {
      result.milk  += (e.dairy.milk  || 0) * sf
      result.cream += (e.dairy.cream || 0) * sf
      result.smp   += (e.dairy.smp   || 0) * sf
    }

    // Sugars
    result.sucrose  += (e.sugars.sucrose  || 0) * sf
    result.dextrose += (e.sugars.dextrose || 0) * sf
    result.glucose  += (e.sugars.glucose  || 0) * sf
    result.bDex     += (e.batchAdditions.bDex  || 0) * sf
    result.bGluc    += (e.batchAdditions.bGluc || 0) * sf

    // Advanced sugars
    for (const adv of (e.advancedSugars ?? [])) {
      if (!adv.qty || adv.qty <= 0) continue
      result.advSugars[adv.label] = (result.advSugars[adv.label] || 0) + adv.qty * sf
    }

    // Stabilizer — group by label
    if (e.stab && e.stab.qty > 0) {
      const stabLabel = e.stab.label || e.stab.rec || 'Σταθεροποιητής'
      result.stabs[stabLabel] = (result.stabs[stabLabel] || 0) + e.stab.qty * sf
    }

    // Pro ingredients
    for (const pi of (e.proIngredients ?? [])) {
      if (!pi.qty || pi.qty <= 0) continue
      result.proIngredients[pi.label] = (result.proIngredients[pi.label] || 0) + pi.qty * sf
    }

    // Pastes
    for (const p of (e.pastes ?? [])) {
      if (!p.qty || p.qty <= 0) continue
      const pasteName = p.name || 'Πάστα'
      result.pastes[pasteName] = (result.pastes[pasteName] || 0) + p.qty * sf
    }

    // Cocoa & alcohol
    result.cocoa   += (e.proSpecial?.cocoa   || 0) * sf
    result.alcohol += (e.proSpecial?.alcohol || 0) * sf
  }

  return result
})

const hasProSection = computed(() => {
  const a = aggregated.value
  return (
    Object.values(a.proIngredients).some(v => v > 0) ||
    Object.values(a.pastes).some(v => v > 0) ||
    a.cocoa > 0 ||
    a.alcohol > 0
  )
})

// ── Queue management ───────────────────────────────────────────────────

function addToQueue() {
  if (!selectedRecipeId.value) return
  const entry = library.value.find(e => e.id === selectedRecipeId.value)
  if (!entry) return
  queue.value.push(reactive({
    recipeId:   entry.id,
    recipeName: entry.name,
    sorbetMode: entry.sorbetMode,
    targetKg:   5,
    entry,
  }))
  selectedRecipeId.value = ''
}

function removeFromQueue(idx) {
  queue.value.splice(idx, 1)
}

// ── Save / Load day ────────────────────────────────────────────────────

function saveDay() {
  const data = queue.value.map(item => ({
    recipeId:   item.recipeId,
    recipeName: item.recipeName,
    targetKg:   item.targetKg,
  }))
  localStorage.setItem(PRODUCTION_KEY, JSON.stringify(data))
  saveFeedback.value = 'Αποθηκεύτηκε!'
  setTimeout(() => { saveFeedback.value = '' }, 2000)
}

function loadDay() {
  try {
    const raw = localStorage.getItem(PRODUCTION_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    const lib = store.getLibrary()
    for (const s of saved) {
      const entry = lib.find(e => e.id === s.recipeId)
      if (!entry) continue
      queue.value.push(reactive({
        recipeId:   s.recipeId,
        recipeName: s.recipeName ?? entry.name,
        sorbetMode: entry.sorbetMode,
        targetKg:   s.targetKg ?? 5,
        entry,
      }))
    }
  } catch { /* ignore */ }
}

// ── Print ──────────────────────────────────────────────────────────────

const printDate = ref('')

async function printPlan() {
  printDate.value = new Date().toLocaleDateString('el-GR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  await nextTick()
  window.print()
}

// ── Mount ──────────────────────────────────────────────────────────────

onMounted(() => {
  library.value = store.getLibrary()
  loadDay()
})
</script>

<style scoped>
.agg-section-label {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0 4px;
  border-top: 1px solid #2a2a2a;
  padding-top: 8px;
}
.agg-section-label:first-child {
  border-top: none;
  margin-top: 0;
}
.agg-row {
  margin-bottom: 5px;
}
.agg-val {
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}

/* Production print sheet — hidden on screen */
.production-print-sheet {
  display: none;
}
</style>

<style>
@media print {
  body * { visibility: hidden !important; }
  .production-print-sheet, .production-print-sheet * { visibility: visible !important; }
  .production-print-sheet {
    display: block !important;
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important;
    background: white !important;
    color: black !important;
  }
}
</style>
