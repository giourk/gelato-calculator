<template>
  <div>
    <!-- Batch size + warnings -->
    <div class="card">
      <div class="card-header">ΜΕΓΕΘΟΣ BATCH</div>
      <div class="card-body">
        <WarningBanner :warnings="store.warnings" />
        <NumberInput
          label="Στόχος batch"
          v-model="batchTarget"
          unit="kg"
          :step="0.1"
          :min="0.1"
          width="90px"
        />
        <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
          <button @click="applyScale" style="background:#1e3a5f;color:var(--blue);padding:5px 14px;font-size:12px;">
            ↗ Εφαρμογή
          </button>
          <span class="dim" style="font-size:11px;font-style:italic;">
            Κλιμακώνει όλα τα υλικά αναλογικά
          </span>
        </div>
      </div>
    </div>

    <!-- Mode toggle -->
    <div class="card">
      <div class="card-body" style="display:flex;gap:8px;">
        <button :class="['mode-btn', !store.sorbetMode && 'active']" @click="store.sorbetMode = false">🧈 Gelato</button>
        <button :class="['mode-btn', store.sorbetMode && 'active']"  @click="store.sorbetMode = true">🍋 Sorbet</button>
      </div>
    </div>

    <!-- Temperature -->
    <div class="card">
      <div class="card-header">ΘΕΡΜΟΚΡΑΣΙΑ ΒΙΤΡΙΝΑΣ</div>
      <div class="card-body">
        <div style="display:flex;gap:5px;">
          <button
            v-for="t in temps"
            :key="t"
            :class="['temp-btn', store.displayTemp === t && 'active']"
            @click="store.displayTemp = t"
          >{{ t }}°C</button>
        </div>
        <p class="dim" style="margin-top:8px;">
          Στόχος PAC: {{ pacTarget.low }}–{{ pacTarget.high }}
        </p>
      </div>
    </div>

    <!-- Dairy / Sorbet water -->
    <div class="card">
      <div class="card-header">{{ store.sorbetMode ? 'ΝΕΡΟ ΣΟΡΜΠΕ' : 'ΓΑΛΑΚΤΟΚΟΜΙΚΑ' }}</div>
      <div class="card-body">
        <template v-if="!store.sorbetMode">
          <NumberInput label="Γάλα"  v-model="store.dairy.milk"    unit="L"   hint="3.5% fat" :step="0.1" />
          <NumberInput label="Κρέμα" v-model="store.dairy.cream"   unit="L"   hint="35% fat"  :step="0.1" />
          <NumberInput label="SMP"   v-model="store.dairy.smp"     unit="g"   />
        </template>
        <template v-else>
          <NumberInput label="Νερό"  v-model="store.dairy.sorbetWater" unit="g" />
        </template>
      </div>
    </div>

    <!-- Sugars -->
    <div class="card">
      <div class="card-header">ΣΑΚΧΑΡΑ ΒΑΣΗΣ</div>
      <div class="card-body">
        <NumberInput label="Ζάχαρη"       v-model="store.sugars.sucrose"  unit="g" />
        <NumberInput label="Dextrose"     v-model="store.sugars.dextrose" unit="g" />
        <NumberInput label="Γλυκόζη 42DE" v-model="store.sugars.glucose"  unit="g" />
        <CollapsiblePanel label="Προχωρημένα σάκχαρα">
          <div v-for="(adv, i) in ADVANCED_SUGARS" :key="adv.id" class="row" style="margin-bottom:8px;">
            <span class="label-text" style="flex:1;">{{ adv.label }}</span>
            <input
              type="number" min="0" step="10" style="width:75px;background:#2a2a2a;border:1px solid #444;border-radius:5px;color:#fff;padding:4px 7px;"
              :value="advQty[i]"
              @input="setAdvQty(i, adv, $event.target.value)"
            />
            <span class="dim" style="margin-left:4px;min-width:14px;">g</span>
          </div>
        </CollapsiblePanel>
      </div>
    </div>

    <!-- Stabilizer -->
    <div class="card">
      <div class="card-header">ΣΤΑΘΕΡΟΠΟΙΗΤΗΣ</div>
      <div class="card-body">
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
          <button
            v-for="(p, key) in STAB_PRESETS"
            :key="key"
            :class="['preset-btn', store.stab.name === p.name && 'active']"
            @click="store.setStabPreset(key)"
          >{{ p.name }}</button>
        </div>
        <NumberInput label="Ποσότητα" v-model="store.stab.qty"  unit="g"    />
        <NumberInput label="Κόστος"   v-model="store.stab.cost" unit="€/kg" :step="0.1" />
      </div>
    </div>

    <!-- Selling prices -->
    <div class="card">
      <div class="card-header">ΤΙΜΕΣ ΠΩΛΗΣΗΣ</div>
      <div class="card-body">
        <NumberInput label="Γάλα"     v-model="store.costDB.milk"     unit="€/L"  :step="0.01" />
        <NumberInput label="Κρέμα"    v-model="store.costDB.cream"    unit="€/L"  :step="0.01" />
        <NumberInput label="SMP"      v-model="store.costDB.smp"      unit="€/kg" :step="0.01" />
        <NumberInput label="Ζάχαρη"   v-model="store.costDB.sucrose"  unit="€/kg" :step="0.01" />
        <NumberInput label="Dextrose" v-model="store.costDB.dextrose" unit="€/kg" :step="0.01" />
        <NumberInput label="Γλυκόζη"  v-model="store.costDB.glucose"  unit="€/kg" :step="0.01" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import { PAC_TARGETS, SORBET_PAC_TARGETS, STAB_PRESETS, ADVANCED_SUGARS } from '../../utils/constants.js'
import NumberInput      from '../shared/NumberInput.vue'
import CollapsiblePanel from '../shared/CollapsiblePanel.vue'
import WarningBanner    from '../shared/WarningBanner.vue'

const store = useCalculatorStore()
const temps = ['-11', '-12', '-14', '-16', '-18', '-20']

const pacTarget = computed(() => {
  const targets = store.sorbetMode ? SORBET_PAC_TARGETS : PAC_TARGETS
  return targets[store.displayTemp] ?? { low: 0, high: 0 }
})

const advQty = computed(() => ADVANCED_SUGARS.map(a => {
  const found = store.advancedSugars.find(x => x.id === a.id)
  return found ? found.qty : 0
}))

function setAdvQty(i, adv, rawVal) {
  const qty = parseFloat(rawVal) || 0
  const existing = store.advancedSugars.find(x => x.id === adv.id)
  if (existing) {
    existing.qty = qty
  } else if (qty > 0) {
    store.advancedSugars.push({ ...adv, qty, cost: store.costDB[adv.id] ?? 0 })
  }
}

// Batch scaling
const batchTarget = ref(+(store.results.realBatchMassG / 1000).toFixed(2))
watch(
  () => store.results.realBatchMassG,
  (v) => { batchTarget.value = +(v / 1000).toFixed(2) }
)
function applyScale() {
  if (batchTarget.value > 0) store.scaleRecipe(batchTarget.value)
}
</script>

<style scoped>
.mode-btn        { flex:1; background:#2a2a2a; color:#aaa; padding:8px; font-size:12px; }
.mode-btn.active { background:var(--accent); color:#fff; }
.temp-btn        { flex:1; background:#2a2a2a; color:#888; font-size:10px; padding:6px 2px; }
.temp-btn.active { background:#1e3a5f; color:var(--blue); }
.preset-btn        { background:#2a2a2a; color:#aaa; font-size:10px; padding:5px 8px; }
.preset-btn.active { background:#1e3a5f; color:var(--blue); }
</style>
