<template>
  <div>
    <!-- Metrics grid -->
    <div class="card">
      <div class="card-header">ΑΠΟΤΕΛΕΣΜΑΤΑ</div>
      <div class="card-body">
        <div class="metrics-grid">
          <div class="metric-card" style="--c:var(--blue)">
            <div class="metric-val">{{ r.pac.toFixed(1) }}</div>
            <div class="metric-name">PAC</div>
            <StatusBadge :value="r.pac" :low="pacTarget.low" :high="pacTarget.high" />
          </div>
          <div class="metric-card" style="--c:var(--green)">
            <div class="metric-val">{{ r.pod.toFixed(1) }}</div>
            <div class="metric-name">POD</div>
          </div>
          <div class="metric-card" style="--c:var(--orange)">
            <div class="metric-val">{{ r.fatPct.toFixed(1) }}%</div>
            <div class="metric-name">FAT</div>
            <StatusBadge :value="r.fatPct" :low="6" :high="8" />
          </div>
          <div class="metric-card" style="--c:var(--purple)">
            <div class="metric-val">{{ r.totalSolids.toFixed(1) }}%</div>
            <div class="metric-name">TOTAL SOLIDS</div>
            <StatusBadge :value="r.totalSolids" :low="36" :high="42" />
          </div>
        </div>
        <div class="row" style="margin-top:10px;">
          <span class="dim">MSNF</span>
          <span class="label-text">{{ r.msnf.toFixed(1) }}%
            <StatusBadge :value="r.msnf" :low="9" :high="11" />
          </span>
        </div>
      </div>
    </div>

    <!-- Overrun visualization -->
    <div class="card">
      <div class="card-header">OVERRUN ΑΠΕΙΚΟΝΙΣΗ</div>
      <div class="card-body">
        <div class="row">
          <span class="dim">Overrun</span>
          <span class="label-text">{{ store.overrun.pct }}%</span>
        </div>
        <div class="row">
          <span class="dim">Mix ({{ r.totalMassG.toFixed(0) }}g)</span>
          <span class="label-text">→ Παγωτό: {{ frozenVolume.toFixed(2) }} L</span>
        </div>
        <div style="background:#1e3a5f;border-radius:6px;height:12px;margin-top:8px;overflow:hidden;">
          <div :style="{ width: frozenPct + '%', background: 'var(--blue)', height: '100%' }"></div>
        </div>
        <div class="row" style="margin-top:4px;">
          <span class="dim">{{ frozenPct.toFixed(0) }}% παγωμένο νερό</span>
        </div>
      </div>
    </div>

    <!-- Cost -->
    <div class="card">
      <div class="card-header">ΚΟΣΤΟΣ</div>
      <div class="card-body">
        <div class="row"><span class="dim">Κόστος / kg</span><span class="label-text" style="font-weight:700;">€{{ r.costPerKg.toFixed(2) }}</span></div>
        <div class="row"><span class="dim">Σύνολο batch</span><span class="label-text" style="font-weight:700;">€{{ r.totalCost.toFixed(2) }}</span></div>
      </div>
    </div>

    <!-- Save recipe -->
    <div class="card">
      <div class="card-body">
        <input type="text" v-model="recipeName" placeholder="Όνομα συνταγής..."
          style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:5px;color:#fff;padding:7px 10px;margin-bottom:8px;" />
        <button @click="save" style="width:100%;background:#1e3a5f;color:var(--blue);padding:10px;font-weight:700;">
          💾 ΑΠΟΘΗΚΕΥΣΗ ΣΥΝΤΑΓΗΣ
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import { PAC_TARGETS, SORBET_PAC_TARGETS } from '../../utils/constants.js'
import StatusBadge from '../shared/StatusBadge.vue'

const store = useCalculatorStore()
const r = computed(() => store.results)
const recipeName = ref('')

const pacTarget = computed(() => {
  const targets = store.sorbetMode ? SORBET_PAC_TARGETS : PAC_TARGETS
  return targets[store.displayTemp] ?? { low: 0, high: 0 }
})

const frozenVolume = computed(() => {
  const mixVol = r.value.totalMassG / 1000 / store.overrun.mixDensity
  return mixVol * (1 + store.overrun.pct / 100)
})

const frozenPct = computed(() => {
  const waterG = r.value.totalMassG * (1 - r.value.totalSolids / 100)
  const frozenWater = waterG * (r.value.pac / 100)
  return Math.min((frozenWater / r.value.totalMassG) * 100, 100)
})

function save() {
  if (!recipeName.value.trim()) return
  store.saveRecipe(recipeName.value.trim())
  recipeName.value = ''
  alert('Η συνταγή αποθηκεύτηκε!')
}
</script>

<style scoped>
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.metric-card  { background: #1a1a2a; border-radius: 8px; padding: 12px; text-align: center; border-top: 2px solid var(--c, #444); }
.metric-val   { color: var(--c, #fff); font-size: 22px; font-weight: 700; }
.metric-name  { color: #446; font-size: 9px; margin: 3px 0 5px; }
</style>
