<template>
  <div>
    <!-- Flavor name -->
    <div class="card">
      <div class="card-header">ΟΝΟΜΑ ΓΕΥΣΗΣ</div>
      <div class="card-body">
        <input type="text" v-model="store.flavorName" placeholder="π.χ. Φουντούκι"
          style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:5px;color:#fff;padding:7px 10px;" />
      </div>
    </div>

    <!-- Overrun & density -->
    <div class="card" style="background:#1a2a3a;">
      <div class="card-header" style="background:#1e3a5f;">OVERRUN & ΠΥΚΝΟΤΗΤΑ</div>
      <div class="card-body">
        <NumberInput label="Overrun"        v-model="store.overrun.pct"        unit="%" :step="1" :max="60" />
        <NumberInput label="Πυκνότητα mix"  v-model="store.overrun.mixDensity" unit="g/mL" :step="0.01" :min="0.9" :max="1.2" />
      </div>
    </div>

    <!-- Pastes & Variegato -->
    <div class="card">
      <div class="card-header">PASTES & VARIEGATO</div>
      <div class="card-body">
        <div v-for="(p, i) in store.pastes" :key="i" class="paste-row">
          <div class="row">
            <input type="text" v-model="p.name" placeholder="Όνομα"
              style="flex:1;background:#2a2a2a;border:1px solid #444;border-radius:5px;color:#fff;padding:5px 8px;font-size:12px;" />
            <button @click="store.removePaste(i)" style="background:#3a1a1a;color:#ff6b6b;margin-left:8px;padding:4px 8px;">✕</button>
          </div>
          <NumberInput label="Ποσότητα"  v-model="p.qty"    unit="g"    />
          <NumberInput label="Dosage"    v-model="p.dosage" unit="g/kg" />
          <NumberInput label="Σάκχαρα"  v-model="p.sugars" unit="%" :step="0.1" />
          <NumberInput label="Λιπαρά"   v-model="p.fat"    unit="%" :step="0.1" />
          <NumberInput label="Πρωτεΐνη" v-model="p.prot"   unit="%" :step="0.1" />
          <NumberInput label="TS%"       v-model="p.ts"     unit="%" :step="0.1" />
          <NumberInput label="Κόστος"   v-model="p.cost"   unit="€/kg" :step="0.1" />
          <hr style="border-color:#333;margin:8px 0;" />
        </div>
        <button @click="store.addPaste()" style="width:100%;background:#1e3a5f;color:var(--blue);padding:8px;">+ Προσθήκη Paste</button>
      </div>
    </div>

    <!-- Pro Υλικά (cocoa & alcohol) -->
    <div class="card" style="background:#1a1a1a;">
      <div class="card-header" style="background:#222;">PRO ΥΛΙΚΑ (ΚΑΚΑΟ & ΑΛΚΟΟΛ)</div>
      <div class="card-body">
        <NumberInput label="Κακάο σκόνη"  v-model="store.proSpecial.cocoa"       unit="g"    />
        <NumberInput label="Κόστος κακάο" v-model="store.proSpecial.cCocoaCost"  unit="€/kg" :step="0.1" />
        <NumberInput label="Αλκοόλ"       v-model="store.proSpecial.alcohol"      unit="g"    />
        <NumberInput label="ABV %"         v-model="store.proSpecial.alcAbv"       unit="%"    :step="0.1" />
      </div>
    </div>

    <!-- Πρόσθετα Υλικά (pro ingredients) -->
    <div class="card">
      <div class="card-header">ΠΡΟΣΘΕΤΑ ΥΛΙΚΑ</div>
      <div class="card-body">
        <div v-for="(pi, i) in store.proIngredients" :key="i" style="margin-bottom:12px;">
          <div class="row">
            <span class="label-text">{{ pi.label }}</span>
            <button @click="store.removeProIngredient(i)" style="background:#3a1a1a;color:#ff6b6b;padding:3px 7px;">✕</button>
          </div>
          <NumberInput label="Ποσότητα" v-model="pi.qty"  unit="g"    />
          <NumberInput label="Κόστος"   v-model="pi.cost" unit="€/kg" :step="0.1" />
          <hr style="border-color:#333;margin-top:8px;" />
        </div>
        <select @change="onAddPro($event)"
          style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:5px;color:#fff;padding:7px 10px;">
          <option value="">+ Προσθήκη υλικού...</option>
          <option v-for="p in PRO_INGREDIENTS" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </div>
    </div>

    <!-- Προσθήκες (batch additions) -->
    <div class="card">
      <div class="card-header">ΠΡΟΣΘΗΚΕΣ</div>
      <div class="card-body">
        <NumberInput label="Dextrose batch"       v-model="store.batchAdditions.bDex"  unit="g" />
        <NumberInput label="Αφυδ. γλυκόζη batch"  v-model="store.batchAdditions.bGluc" unit="g" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCalculatorStore } from '../../stores/calculator.js'
import { PRO_INGREDIENTS } from '../../utils/constants.js'
import NumberInput from '../shared/NumberInput.vue'

const store = useCalculatorStore()

function onAddPro(e) {
  if (e.target.value) {
    store.addProIngredient(e.target.value)
    e.target.value = ''
  }
}
</script>

<style scoped>
.paste-row { background:#222; border-radius:8px; padding:10px; margin-bottom:10px; }
</style>
