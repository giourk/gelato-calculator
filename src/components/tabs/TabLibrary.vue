<template>
  <div>
    <div class="card">
      <div class="card-header">ΒΙΒΛΙΟΘΗΚΗ ΣΥΝΤΑΓΩΝ</div>
      <div class="card-body">
        <div v-if="recipes.length === 0" style="color:#555;text-align:center;padding:20px;">
          Δεν υπάρχουν αποθηκευμένες συνταγές.
        </div>

        <!-- Compare button (shown when exactly 2 are selected) -->
        <div v-if="selectedIds.size === 2" style="margin-bottom:10px;text-align:center;">
          <button
            @click="openComparison"
            style="background:#1e3a1e;color:var(--green);font-size:12px;padding:7px 18px;width:100%;"
          >Σύγκριση ↓</button>
        </div>

        <div v-for="entry in recipes" :key="entry.id" class="recipe-row">
          <!-- Checkbox (always visible) -->
          <div style="margin-right:8px;flex-shrink:0;">
            <input
              type="checkbox"
              :checked="selectedIds.has(entry.id)"
              @change="toggleSelect(entry.id)"
              style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent);"
            />
          </div>

          <div style="flex:1;min-width:0;">
            <div
              class="label-text"
              style="font-weight:700;cursor:pointer;"
              @click="toggleSelect(entry.id)"
            >{{ entry.name }}</div>
            <div class="dim" style="margin-top:2px;">{{ entry.date }}</div>
            <div v-if="entry.summary" class="dim" style="margin-top:2px;font-size:9px;">
              PAC {{ entry.summary.pac.toFixed(1) }} · Fat {{ entry.summary.fatPct.toFixed(1) }}% · TS {{ entry.summary.totalSolids.toFixed(1) }}%
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;">
            <button @click="load(entry)" style="background:#1e3a5f;color:var(--blue);font-size:11px;">Φόρτωση</button>
            <button @click="del(entry.id)" style="background:#3a1a1a;color:var(--red);font-size:11px;">Διαγραφή</button>
            <button @click="printRecipe(entry)" style="background:#1a3a1a;color:var(--green);font-size:11px;">Εκτύπωση</button>
          </div>
        </div>

        <!-- Clear selection hint when some are selected -->
        <div v-if="anySelected" style="margin-top:8px;text-align:center;">
          <button
            @click="clearSelection"
            style="background:transparent;color:var(--text-dim);font-size:10px;padding:3px 8px;border:1px solid #333;"
          >✕ Ακύρωση επιλογής ({{ selectedIds.size }}/2)</button>
        </div>
      </div>
    </div>

    <!-- Comparison panel (rendered below the list) -->
    <RecipeComparison
      v-if="showComparison && compRecipeA && compRecipeB"
      :recipeA="compRecipeA"
      :recipeB="compRecipeB"
      @close="closeComparison"
    />

    <RecipePrintSheet :recipe="selectedRecipe" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import RecipePrintSheet from '../RecipePrintSheet.vue'
import RecipeComparison from '../shared/RecipeComparison.vue'

const store = useCalculatorStore()
const recipes = ref([])
const selectedRecipe = ref(null)

// ── Comparison state ──────────────────────────────────────────────────────────
const selectedIds = ref(new Set())
const showComparison = ref(false)
const compRecipeA = ref(null)
const compRecipeB = ref(null)

const anySelected = computed(() => selectedIds.value.size > 0)

function refresh() { recipes.value = store.getLibrary() }
onMounted(refresh)

function toggleSelect(id) {
  // Create a new Set so Vue reactivity picks up the change
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    if (next.size >= 2) {
      // Remove the oldest (first) selection
      const [first] = next
      next.delete(first)
    }
    next.add(id)
  }
  selectedIds.value = next
  // Close comparison if selection changed
  showComparison.value = false
}

function clearSelection() {
  selectedIds.value = new Set()
  showComparison.value = false
}

function openComparison() {
  const ids = [...selectedIds.value]
  compRecipeA.value = recipes.value.find(r => r.id === ids[0]) ?? null
  compRecipeB.value = recipes.value.find(r => r.id === ids[1]) ?? null
  showComparison.value = true
}

function closeComparison() {
  showComparison.value = false
}

function load(entry) {
  store.loadRecipe(entry)
  refresh()
  alert(`Φορτώθηκε: ${entry.name}`)
}

function del(id) {
  store.deleteRecipe(id)
  refresh()
  // Remove from selection if deleted
  if (selectedIds.value.has(id)) {
    const next = new Set(selectedIds.value)
    next.delete(id)
    selectedIds.value = next
  }
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
