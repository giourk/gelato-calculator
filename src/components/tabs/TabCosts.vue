<template>
  <div>
    <!-- Search -->
    <div class="card">
      <div class="card-body">
        <input
          v-model="search"
          type="text"
          placeholder="Αναζήτηση υλικού..."
          style="width:100%;background:#1a1a1a;border:1px solid #444;border-radius:6px;color:#fff;padding:8px 12px;font-size:13px;"
        />
      </div>
    </div>

    <!-- Dairy section -->
    <div v-if="visibleSections.dairy" class="card">
      <div class="card-header">ΓΑΛΑΚΤΟΚΟΜΙΚΑ</div>
      <div class="card-body">
        <div class="cost-header-row">
          <span class="cost-name-col"></span>
          <span class="cost-default-col dim" style="font-size:10px;text-align:right;">Προεπιλογή</span>
          <span class="cost-input-col dim" style="font-size:10px;text-align:right;">Τιμή σας</span>
        </div>
        <template v-for="row in dairyRows" :key="row.key">
          <CostRow
            v-if="matchesSearch(row.label)"
            :label="row.label"
            :unit="row.unit"
            :default-val="defaultVal(row.key)"
            v-model="store.costDB[row.key]"
            @update:modelValue="onCostChange(row.key, $event)"
          />
        </template>
      </div>
    </div>

    <!-- Sugars & Stabilizers section -->
    <div v-if="visibleSections.sugars" class="card">
      <div class="card-header">ΣΑΚΧΑΡΑ &amp; ΣΤΑΘΕΡΟΠΟΙΗΤΕΣ</div>
      <div class="card-body">
        <div class="cost-header-row">
          <span class="cost-name-col"></span>
          <span class="cost-default-col dim" style="font-size:10px;text-align:right;">Προεπιλογή</span>
          <span class="cost-input-col dim" style="font-size:10px;text-align:right;">Τιμή σας</span>
        </div>
        <template v-for="row in sugarRows" :key="row.key">
          <CostRow
            v-if="matchesSearch(row.label)"
            :label="row.label"
            :unit="row.unit"
            :default-val="defaultVal(row.key)"
            v-model="store.costDB[row.key]"
            @update:modelValue="onCostChange(row.key, $event)"
          />
        </template>
        <div class="cost-subsection-label">Σταθεροποιητές</div>
        <template v-for="row in stabRows" :key="row.key">
          <CostRow
            v-if="matchesSearch(row.label)"
            :label="row.label"
            :unit="row.unit"
            :default-val="defaultVal(row.key)"
            v-model="store.costDB[row.key]"
          />
        </template>
      </div>
    </div>

    <!-- Special section -->
    <div v-if="visibleSections.special" class="card">
      <div class="card-header">ΕΙΔΙΚΑ ΣΥΣΤΑΤΙΚΑ</div>
      <div class="card-body">
        <div class="cost-header-row">
          <span class="cost-name-col"></span>
          <span class="cost-default-col dim" style="font-size:10px;text-align:right;">Προεπιλογή</span>
          <span class="cost-input-col dim" style="font-size:10px;text-align:right;">Τιμή σας</span>
        </div>
        <template v-for="row in specialRows" :key="row.key">
          <CostRow
            v-if="matchesSearch(row.label)"
            :label="row.label"
            :unit="row.unit"
            :default-val="defaultVal(row.key)"
            v-model="store.costDB[row.key]"
          />
        </template>
      </div>
    </div>

    <!-- Pastes section -->
    <div v-if="visibleSections.pastes" class="card">
      <div class="card-header">ΠΕΣΤΕΣ (ΓΕΥΣΗΣ)</div>
      <div class="card-body">
        <div class="cost-header-row">
          <span class="cost-name-col"></span>
          <span class="cost-default-col dim" style="font-size:10px;text-align:right;">Προεπιλογή</span>
          <span class="cost-input-col dim" style="font-size:10px;text-align:right;">Τιμή σας</span>
        </div>
        <CostRow
          v-if="matchesSearch('Πάστα γεύσης (γενική)')"
          label="Πάστα γεύσης (γενική)"
          unit="€/kg"
          :default-val="defaultVal('paste')"
          v-model="store.costDB['paste']"
        />
      </div>
    </div>

    <!-- Pro Ingredients section (collapsible) -->
    <div v-if="visibleSections.pro" class="card">
      <div
        class="card-header"
        style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
        @click="proExpanded = !proExpanded"
      >
        <span>PRO ΥΛΙΚΑ ({{ PRO_INGREDIENTS.length }})</span>
        <span style="font-size:11px;color:#555;">{{ proExpanded ? '▲ Σύμπτυξη' : '▼ Ανάπτυξη' }}</span>
      </div>
      <div v-if="proExpanded" class="card-body">
        <div class="cost-header-row">
          <span class="cost-name-col"></span>
          <span class="cost-default-col dim" style="font-size:10px;text-align:right;">Προεπιλογή</span>
          <span class="cost-input-col dim" style="font-size:10px;text-align:right;">Τιμή σας</span>
        </div>
        <template v-for="ing in PRO_INGREDIENTS" :key="ing.id">
          <CostRow
            v-if="matchesSearch(ing.label)"
            :label="ing.label"
            unit="€/kg"
            :default-val="ing.defaultCost"
            v-model="store.costDB[`pro_${ing.id}`]"
          />
        </template>
      </div>
    </div>

    <!-- Actions -->
    <div class="card">
      <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;">
        <button
          @click="handleSave"
          style="flex:1;background:#1e3a5f;color:var(--blue);padding:10px;font-size:13px;font-weight:700;"
        >
          💾 Αποθήκευση
        </button>
        <button
          @click="handleReset"
          style="flex:1;background:#3a1a1a;color:var(--red);padding:10px;font-size:13px;font-weight:700;"
        >
          ↺ Επαναφορά
        </button>
      </div>
      <div v-if="store.costDB._savedAt" class="card-body" style="padding-top:0;">
        <span class="dim" style="font-size:10px;">
          Τελευταία αποθήκευση: {{ formatDate(store.costDB._savedAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import { PRO_INGREDIENTS, ADVANCED_SUGARS } from '../../utils/constants.js'
import CostRow from '../CostRow.vue'

const store = useCalculatorStore()
const search = ref('')
const proExpanded = ref(false)

// ── Row definitions ────────────────────────────────────────────────────

const dairyRows = [
  { key: 'milk',        label: 'Γάλα',             unit: '€/L' },
  { key: 'cream',       label: 'Κρέμα γάλακτος',   unit: '€/L' },
  { key: 'smp',         label: 'SMP (σκόνη γάλα)', unit: '€/kg' },
  { key: 'sorbetWater', label: 'Νερό σορμπέ',       unit: '€/L' },
]

const sugarRows = [
  { key: 'sucrose',     label: 'Ζάχαρη',            unit: '€/kg' },
  { key: 'dextrose',    label: 'Dextrose',           unit: '€/kg' },
  { key: 'glucose',     label: 'Γλυκόζη 42DE',       unit: '€/kg' },
  { key: 'bdex',        label: 'Dextrose (batch)',   unit: '€/kg' },
  { key: 'bgluc',       label: 'Γλυκόζη (batch)',    unit: '€/kg' },
  ...ADVANCED_SUGARS.map(s => ({ key: s.id, label: s.label, unit: '€/kg' })),
]

const stabRows = [
  { key: 'stab_base50c', label: 'Aromitalia Base 50C', unit: '€/kg' },
  { key: 'stab_base100', label: 'Aromitalia Base 100',  unit: '€/kg' },
  { key: 'stab_neutro',  label: 'Neutro (stabilizer)',  unit: '€/kg' },
  { key: 'stab_custom',  label: 'Custom Base',          unit: '€/kg' },
]

const specialRows = [
  { key: 'cocoa',   label: 'Κακάο σκόνη', unit: '€/kg' },
  { key: 'alcohol', label: 'Αλκοόλ',      unit: '€/kg' },
]

// ── Search filter ──────────────────────────────────────────────────────

function matchesSearch(label) {
  if (!search.value.trim()) return true
  return label.toLowerCase().includes(search.value.toLowerCase().trim())
}

// Determine which section headers to show (hide entire card if no rows match)
const visibleSections = computed(() => {
  const s = search.value.trim().toLowerCase()
  if (!s) return { dairy: true, sugars: true, special: true, pastes: true, pro: true }
  return {
    dairy:   dairyRows.some(r => r.label.toLowerCase().includes(s)),
    sugars:  [...sugarRows, ...stabRows].some(r => r.label.toLowerCase().includes(s)),
    special: specialRows.some(r => r.label.toLowerCase().includes(s)),
    pastes:  'πάστα γεύσης (γενική)'.includes(s),
    pro:     PRO_INGREDIENTS.some(ing => ing.label.toLowerCase().includes(s)),
  }
})

// ── Helpers ────────────────────────────────────────────────────────────

function defaultVal(key) {
  return store.DEFAULT_COSTS[key] ?? 0
}

// When a dairy/sugar cost changes, sync to costs reactive too
function onCostChange(key, val) {
  if (key in store.costs) {
    store.costs[key] = val
  }
}

function handleSave() {
  store.saveCostDB()
  alert('Οι τιμές αποθηκεύτηκαν!')
}

function handleReset() {
  if (confirm('Επαναφορά όλων των τιμών στις προεπιλογές;')) {
    store.resetCostDB()
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('el-GR')
  } catch {
    return iso
  }
}
</script>

<style scoped>
.cost-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.cost-name-col   { flex: 1; }
.cost-default-col { width: 70px; }
.cost-input-col   { width: 80px; }
.cost-subsection-label {
  font-size: 10px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0 4px;
  border-top: 1px solid #2a2a2a;
  padding-top: 8px;
}
</style>
