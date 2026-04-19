<template>
  <Teleport to="body">
    <div v-if="recipe && results" class="gelato-print-sheet">

      <!-- 1. Header -->
      <div class="ps-header">
        <div class="ps-title">{{ recipe.name }}</div>
        <div class="ps-meta">
          {{ recipe.date }} &nbsp;·&nbsp; {{ recipe.sorbetMode ? 'Sorbet' : 'Gelato' }} &nbsp;·&nbsp; {{ recipe.displayTemp ?? '?' }}°C
        </div>
      </div>

      <!-- 2. Results -->
      <div class="ps-section">
        <div class="ps-section-title">ΑΠΟΤΕΛΕΣΜΑΤΑ</div>
        <div class="ps-grid3">
          <div class="ps-metric"><span class="ps-label">PAC</span><span class="ps-val">{{ results.pac.toFixed(1) }}</span></div>
          <div class="ps-metric"><span class="ps-label">POD</span><span class="ps-val">{{ results.pod.toFixed(1) }}</span></div>
          <div class="ps-metric"><span class="ps-label">Fat%</span><span class="ps-val">{{ results.fatPct.toFixed(1) }}%</span></div>
          <div class="ps-metric"><span class="ps-label">MSNF%</span><span class="ps-val">{{ results.msnf.toFixed(1) }}%</span></div>
          <div class="ps-metric"><span class="ps-label">TS%</span><span class="ps-val">{{ results.totalSolids.toFixed(1) }}%</span></div>
          <div class="ps-metric"><span class="ps-label">Κόστος/kg</span><span class="ps-val">{{ results.costPerKg.toFixed(2) }}€</span></div>
        </div>
      </div>

      <!-- 3. Dairy / Water -->
      <div class="ps-section">
        <div class="ps-section-title">ΓΑΛΑΚΤΟΚΟΜΙΚΑ</div>
        <template v-if="!recipe.sorbetMode">
          <div class="ps-row"><span>Γάλα</span><span>{{ recipe.dairy.milk }} L ({{ recipe.dairy.milkFat }}% fat)</span></div>
          <div class="ps-row"><span>Κρέμα</span><span>{{ recipe.dairy.cream }} L ({{ recipe.dairy.creamFat }}% fat)</span></div>
          <div class="ps-row"><span>SMP</span><span>{{ recipe.dairy.smp }} g</span></div>
        </template>
        <template v-else>
          <div class="ps-row"><span>Νερό</span><span>{{ recipe.dairy.sorbetWater }} L</span></div>
        </template>
      </div>

      <!-- 4. Sugars -->
      <div class="ps-section">
        <div class="ps-section-title">ΣΑΚΧΑΡΑ</div>
        <div class="ps-row"><span>Ζάχαρη</span><span>{{ recipe.sugars.sucrose }} g</span></div>
        <div class="ps-row"><span>Dextrose</span><span>{{ recipe.sugars.dextrose }} g</span></div>
        <div class="ps-row"><span>Γλυκόζη 42DE</span><span>{{ recipe.sugars.glucose }} g</span></div>
        <template v-if="recipe.advancedSugars && recipe.advancedSugars.length">
          <div v-for="adv in recipe.advancedSugars" :key="adv.id" class="ps-row">
            <span>{{ adv.label }}</span><span>{{ adv.qty }} g</span>
          </div>
        </template>
      </div>

      <!-- 5. Stabilizer -->
      <div class="ps-section">
        <div class="ps-section-title">ΣΤΑΘΕΡΟΠΟΙΗΤΗΣ</div>
        <div class="ps-row">
          <span>{{ recipe.stab.name || 'Custom' }}</span>
          <span>{{ recipe.stab.qty }} g</span>
        </div>
      </div>

      <!-- 6. Flavor -->
      <div class="ps-section">
        <div class="ps-section-title">ΓΕΥΣΗ</div>
        <div class="ps-row"><span>Γεύση</span><span>{{ recipe.flavorName || '—' }}</span></div>
        <div class="ps-row"><span>Overrun</span><span>{{ recipe.overrun.pct }}%</span></div>
        <div class="ps-row"><span>Πυκνότητα Mix</span><span>{{ recipe.overrun.mixDensity }}</span></div>
        <div class="ps-row"><span>Batch Dextrose</span><span>{{ recipe.batchAdditions.bDex }} g</span></div>
        <div class="ps-row"><span>Batch Γλυκόζη</span><span>{{ recipe.batchAdditions.bGluc }} g</span></div>
      </div>

      <!-- 7. Pastes & Variegato (hidden if empty) -->
      <div v-if="recipe.pastes && recipe.pastes.length" class="ps-section">
        <div class="ps-section-title">PASTES & VARIEGATO</div>
        <div v-for="(p, i) in recipe.pastes" :key="i" class="ps-row">
          <span>{{ p.name || '—' }}</span>
          <span>{{ p.qty }} g &nbsp;·&nbsp; {{ p.dosage }} g/kg</span>
        </div>
      </div>

      <!-- 8. Pro Υλικά (hidden if cocoa=0 and alcohol=0) -->
      <div v-if="recipe.proSpecial && (recipe.proSpecial.cocoa > 0 || recipe.proSpecial.alcohol > 0)" class="ps-section">
        <div class="ps-section-title">PRO ΥΛΙΚΑ</div>
        <div v-if="recipe.proSpecial.cocoa > 0" class="ps-row">
          <span>Κακάο</span><span>{{ recipe.proSpecial.cocoa }} g</span>
        </div>
        <div v-if="recipe.proSpecial.alcohol > 0" class="ps-row">
          <span>Αλκοόλ</span><span>{{ recipe.proSpecial.alcohol }} ml &nbsp;·&nbsp; {{ recipe.proSpecial.alcAbv }}% ABV</span>
        </div>
      </div>

      <!-- 9. Πρόσθετα Υλικά (hidden if empty) -->
      <div v-if="recipe.proIngredients && recipe.proIngredients.length" class="ps-section">
        <div class="ps-section-title">ΠΡΟΣΘΕΤΑ ΥΛΙΚΑ</div>
        <div v-for="pi in recipe.proIngredients" :key="pi.id" class="ps-row">
          <span>{{ pi.label }}</span><span>{{ pi.qty }} g</span>
        </div>
      </div>

      <!-- 10. Footer -->
      <div class="ps-footer">Gelato Pro Calculator &nbsp;·&nbsp; {{ printDate }}</div>

    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { calcBatchSummary } from '../utils/calculations.js'

const props = defineProps({
  recipe: { type: Object, default: null },
})

const results = computed(() => {
  if (!props.recipe) return null
  const rec = props.recipe
  return calcBatchSummary({
    sorbetMode:     rec.sorbetMode,
    milk:           rec.sorbetMode ? rec.dairy.sorbetWater : rec.dairy.milk,
    milkFat:        rec.dairy.milkFat,
    cream:          rec.dairy.cream,
    creamFat:       rec.dairy.creamFat,
    smp:            rec.dairy.smp,
    sucrose:        rec.sugars.sucrose,
    dextrose:       rec.sugars.dextrose,
    glucose:        rec.sugars.glucose,
    stab:           rec.stab,
    bDex:           rec.batchAdditions.bDex,
    bGluc:          rec.batchAdditions.bGluc,
    advancedSugars: rec.advancedSugars ?? [],
    pastes:         rec.pastes ?? [],
    proIngredients: rec.proIngredients ?? [],
    costs:          rec.costs ?? { milk: 0, cream: 0, smp: 0, sucrose: 0, dextrose: 0, glucose: 0, sorbetWater: 0, bdex: 0, bgluc: 0 },
    cocoa:          rec.proSpecial?.cocoa ?? 0,
    alcohol:        rec.proSpecial?.alcohol ?? 0,
    alcAbv:         rec.proSpecial?.alcAbv ?? 0,
  })
})

const printDate = computed(() => new Date().toLocaleDateString('el-GR'))
</script>

<style>
/* Not scoped: needed for Teleport + @media print targeting by main.css */
.gelato-print-sheet { display: none; }

@page { size: A4 portrait; margin: 15mm; }

.ps-header { margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; }
.ps-title  { font-size: 22px; font-weight: 700; }
.ps-meta   { font-size: 12px; color: #555; margin-top: 4px; }

.ps-section { margin-bottom: 12px; }
.ps-section-title {
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; border-bottom: 1px solid #ccc;
  padding-bottom: 3px; margin-bottom: 6px; color: #333;
}

.ps-row {
  display: flex; justify-content: space-between;
  font-size: 12px; padding: 2px 0; line-height: 1.5;
}

.ps-grid3 {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px;
}
.ps-metric { display: flex; justify-content: space-between; font-size: 12px; }
.ps-label  { color: #555; }
.ps-val    { font-weight: 700; }

.ps-footer {
  margin-top: 20px; border-top: 1px solid #ccc;
  padding-top: 6px; font-size: 10px; color: #888; text-align: center;
}
</style>
