<template>
  <div>
    <div class="card">
      <div class="card-header">ΒΙΒΛΙΟΘΗΚΗ ΣΥΝΤΑΓΩΝ</div>
      <div class="card-body">
        <div v-if="recipes.length === 0" style="color:#555;text-align:center;padding:20px;">
          Δεν υπάρχουν αποθηκευμένες συνταγές.
        </div>
        <div v-for="entry in recipes" :key="entry.id" class="recipe-row">
          <div>
            <div class="label-text" style="font-weight:700;">{{ entry.name }}</div>
            <div class="dim" style="margin-top:2px;">{{ entry.date }}</div>
            <div v-if="entry.summary" class="dim" style="margin-top:2px;font-size:9px;">
              PAC {{ entry.summary.pac.toFixed(1) }} · Fat {{ entry.summary.fatPct.toFixed(1) }}% · TS {{ entry.summary.totalSolids.toFixed(1) }}%
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            <button @click="load(entry)" style="background:#1e3a5f;color:var(--blue);font-size:11px;">Φόρτωση</button>
            <button @click="del(entry.id)" style="background:#3a1a1a;color:var(--red);font-size:11px;">Διαγραφή</button>
            <button @click="printRecipe(entry)" style="background:#1a3a1a;color:var(--green);font-size:11px;">Εκτύπωση</button>
          </div>
        </div>
      </div>
    </div>
    <RecipePrintSheet :recipe="selectedRecipe" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import RecipePrintSheet from '../RecipePrintSheet.vue'

const store = useCalculatorStore()
const recipes = ref([])
const selectedRecipe = ref(null)

function refresh() { recipes.value = store.getLibrary() }
onMounted(refresh)

function load(entry) {
  store.loadRecipe(entry)
  refresh()
  alert(`Φορτώθηκε: ${entry.name}`)
}

function del(id) {
  store.deleteRecipe(id)
  refresh()
}

async function printRecipe(entry) {
  selectedRecipe.value = entry
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  window.print()
  selectedRecipe.value = null
}
</script>

<style scoped>
.recipe-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #333; }
.recipe-row:last-child { border-bottom:none; }
</style>
