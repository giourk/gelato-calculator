# UX Upgrades Design — Gelato Calculator

**Date:** 2026-04-22
**Scope:** Three usability improvements to `gelato-web` (Vue 3 + Pinia)

---

## 1. Real Batch Mass & Cost Clarity

### Problem
`totalCost` in the store is `baseCost × sf` — scaled to the internal 5000 g normalised batch.
`totalMassG` returned from `calcBatchSummary` is also the normalised mass (~5000 g), not the
actual recipe mass (e.g. 62 kg for 41 L milk). Users expect "Σύνολο batch" to mean the cost of
the ingredients they actually weighed out, not a fictional 5 kg reference batch.

### Solution

**`calculations.js`** — two new return fields added to `calcBatchSummary`:

| Field | Formula | Meaning |
|-------|---------|---------|
| `realBatchMassG` | `totalBaseFull + bDex + bGluc + advQtyTotal + totalPasteQty` | Actual grams of all inputs, never normalised |
| `realTotalCost` | `baseCost + advCostTotal + pasteCost + proCost` (no `× sf`) | Cost of the real recipe |

`costPerKg` is unchanged — sf cancels, it has always been correct.

**`TabResults.vue`** cost card:
```
Κόστος / kg       €1.04    ← unchanged
Κόστος συνταγής   €64.83   ← new (realTotalCost)
```

The old "Σύνολο batch" line (normalised 5 kg cost) is removed entirely — confusing and
redundant with `costPerKg`.

---

## 2. Batch Scaling

### Problem
There is no way to say "I want to make 30 kg of this recipe." Users must manually multiply
every ingredient themselves.

### Solution

**`calculator.js` (store)** — new `scaleRecipe(targetKg)` action:

```js
function scaleRecipe(targetKg) {
  const sf = (targetKg * 1000) / results.value.realBatchMassG
  // Scale all quantities — never touch percentages or costs
  dairy.milk        *= sf
  dairy.cream       *= sf
  dairy.smp         *= sf
  dairy.sorbetWater *= sf
  sugars.sucrose    *= sf
  sugars.dextrose   *= sf
  sugars.glucose    *= sf
  stab.qty          *= sf
  batchAdditions.bDex  *= sf
  batchAdditions.bGluc *= sf
  for (const a of advancedSugars.value)  a.qty *= sf
  for (const p of pastes.value)          p.qty *= sf
  for (const p of proIngredients.value)  p.qty *= sf
  proSpecial.cocoa   *= sf
  proSpecial.alcohol *= sf
}
```

Fields never scaled: `milkFat`, `creamFat`, `fpd`, all cost fields — these are ratios or
unit prices, not quantities.

**`TabBase.vue`** — new control at the very top of the tab, above the mode toggle:

```
┌─────────────────────────────────────────┐
│ Μέγεθος batch   [ 62.3 ] kg            │
│ Αλλαγή κλιμακώνει όλα τα υλικά         │
│ αναλογικά                               │
└─────────────────────────────────────────┘
```

- The field displays `store.results.realBatchMassG / 1000` as a computed read —
  so it always reflects the current true batch size (including after a scale operation)
- Bound to a `NumberInput` with `unit="kg"` and `:step="0.1"`
- Triggers `store.scaleRecipe(value)` on `@change` (blur/Enter) — **not** on every
  keystroke, to avoid mid-value scaling chaos
- Guard in `scaleRecipe`: returns early if `realBatchMassG <= 0` to prevent division by zero
- A small italic hint below the field: *"Αλλαγή κλιμακώνει όλα τα υλικά αναλογικά"*
- Composition metrics (PAC, fat, MSNF, TS) are invariant to scaling — only quantities change

---

## 3. Out-of-Range Warnings

### Problem
`StatusBadge` indicators only appear in the Results tab. While building a recipe in Base or
Flavor tabs, there is no signal that the current values are out of professional range.

### Solution

**`calculations.js`** — new export `calcWarnings(results, displayTemp, sorbetMode)`:

Returns `Array<{ metric: string, value: number, message: string }>`.
Empty array when everything is in range.

Target ranges (mirror existing `constants.js` and `TabInfo.vue` values):

| Metric | Gelato | Sorbet |
|--------|--------|--------|
| PAC | `PAC_TARGETS[temp].low–high` | `SORBET_PAC_TARGETS[temp].low–high` |
| POD | 16–22 | 16–22 |
| Fat % | 6–8 | not checked |
| MSNF % | 9–11 | not checked |
| TS % | 36–40 | 28–35 |
| Frozen water % | 86–93 | 86–93 |

**`calculator.js` (store)** — new computed:

```js
const warnings = computed(() =>
  calcWarnings(results.value, displayTemp.value, sorbetMode.value)
)
```

Exported alongside `results`.

**New `WarningBanner.vue`** (in `src/components/shared/`):

- Props: `warnings: Array`
- Hidden with `v-if="warnings.length > 0"`
- When visible: amber-background card at top of tab, one line per out-of-range metric
- Example line: *"PAC 14.2 — χαμηλό για -16°C (στόχος 25–27)"*
- No per-row icons or colours — the amber card is the signal

**Usage:**

```vue
<!-- top of TabBase.vue and TabFlavor.vue card bodies -->
<WarningBanner :warnings="store.warnings" />
```

---

## Architecture Summary

```
calculations.js          (pure functions, no Vue)
  calcBatchSummary()  → + realBatchMassG, realTotalCost
  calcIFPMetrics()    → unchanged
  calcWarnings()      → new export

calculator.js            (Pinia store)
  results computed    → merges calcBatchSummary + calcIFPMetrics (unchanged)
  warnings computed   → new, calls calcWarnings()
  scaleRecipe(kg)     → new action

Components
  TabBase.vue         → batch-scale control at top + <WarningBanner>
  TabFlavor.vue       → <WarningBanner>
  TabResults.vue      → updated cost card (realTotalCost, remove normalised total)
  shared/WarningBanner.vue → new component
```

---

## Testing

- `calcBatchSummary` — new assertions for `realBatchMassG` and `realTotalCost`
- `calcWarnings` — unit tests covering each metric in/out of range, both gelato and sorbet
- `scaleRecipe` — test that all quantity fields scale and no ratio/cost fields change
- Existing 54 tests must remain green

---

## Out of Scope

- Saving the target batch size to the library (recipes save ingredient values, which already
  reflect the scaled quantities)
- Per-field inline warning badges (Option B, not chosen)
- Floating/sticky warning strip (Option C, not chosen)
