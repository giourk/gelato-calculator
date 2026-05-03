<template>
  <div class="app">
    <header class="app-header">
      <span class="app-title">🧊 GELATO PRO</span>
    </header>

    <nav class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </nav>

    <main class="tab-content">
      <TabBase     v-if="activeTab === 'base'" />
      <TabFlavor   v-if="activeTab === 'flavor'" />
      <TabResults  v-if="activeTab === 'results'" />
      <TabLibrary  v-if="activeTab === 'library'" />
      <TabCosts      v-if="activeTab === 'costs'" />
      <TabProduction v-if="activeTab === 'production'" />
      <TabInfo       v-if="activeTab === 'info'" />
    </main>

    <footer class="metrics-bar">
      <div class="metric">
        <span class="metric-val" :class="pacColor">{{ store.results.pac.toFixed(1) }}</span>
        <span class="metric-lbl">PAC</span>
      </div>
      <div class="metric">
        <span class="metric-val" style="color:var(--green)">{{ store.results.pod.toFixed(1) }}</span>
        <span class="metric-lbl">POD</span>
      </div>
      <div class="metric">
        <span class="metric-val" style="color:var(--orange)">{{ store.results.fatPct.toFixed(1) }}%</span>
        <span class="metric-lbl">Fat</span>
      </div>
      <div class="metric">
        <span class="metric-val" style="color:var(--purple)">{{ store.results.totalSolids.toFixed(1) }}%</span>
        <span class="metric-lbl">TS</span>
      </div>
      <div class="metric">
        <span class="metric-val" style="color:var(--blue)">€{{ store.results.costPerKg.toFixed(2) }}</span>
        <span class="metric-lbl">/kg</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCalculatorStore } from './stores/calculator.js'
import { PAC_TARGETS, SORBET_PAC_TARGETS } from './utils/constants.js'
import TabBase    from './components/tabs/TabBase.vue'
import TabFlavor  from './components/tabs/TabFlavor.vue'
import TabResults from './components/tabs/TabResults.vue'
import TabLibrary from './components/tabs/TabLibrary.vue'
import TabCosts      from './components/tabs/TabCosts.vue'
import TabProduction from './components/tabs/TabProduction.vue'
import TabInfo       from './components/tabs/TabInfo.vue'

const store = useCalculatorStore()
const activeTab = ref('base')
const tabs = [
  { id: 'base',    label: 'ΒΑΣΗ' },
  { id: 'flavor',  label: 'ΓΕΥΣΗ' },
  { id: 'results', label: 'ΑΠΟΤΕΛ.' },
  { id: 'library', label: 'ΒΙΒΛΙΟΘ.' },
  { id: 'costs',      label: 'ΤΙΜΕΣ' },
  { id: 'production', label: 'ΠΑΡΑΓΩΓΗ' },
  { id: 'info',       label: 'INFO' },
]

const pacColor = computed(() => {
  const targets = store.sorbetMode ? SORBET_PAC_TARGETS : PAC_TARGETS
  const t = targets[store.displayTemp]
  if (!t) return ''
  const p = store.results.pac
  if (p < t.low)  return 'pac-low'
  if (p > t.high) return 'pac-high'
  return 'pac-ok'
})
</script>

<style>
.app { display: flex; flex-direction: column; min-height: 100dvh; }
.app-header { background: #0d0d0d; padding: 10px 16px; }
.app-title  { color: #fff; font-weight: 700; font-size: 14px; letter-spacing: 1px; }
.tab-nav    { display: grid; grid-template-columns: repeat(7, 1fr); background: #1a1a1a; border-bottom: 1px solid #333; }
.tab-btn    { background: none; border-radius: 0; padding: 9px 4px; color: #555; font-size: 10px; font-weight: 700; border-bottom: 2px solid transparent; }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); background: #1e3a5f22; }
.tab-content { flex: 1; overflow-y: auto; padding: 10px; padding-bottom: 70px; }
.metrics-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #0d1f35; border-top: 1px solid #1e3a5f; padding: 8px 12px; display: flex; justify-content: space-around; }
.metric      { display: flex; flex-direction: column; align-items: center; }
.metric-val  { font-size: 15px; font-weight: 700; line-height: 1.2; }
.metric-lbl  { color: #335; font-size: 9px; margin-top: 1px; }
.pac-ok   { color: var(--green); }
.pac-low  { color: var(--orange); }
.pac-high { color: var(--red); }
</style>
