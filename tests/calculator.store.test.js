import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCalculatorStore } from '../src/stores/calculator.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('scaleRecipe', () => {
  it('scales milk and cream proportionally', () => {
    const store = useCalculatorStore()
    const originalMilk  = store.dairy.milk
    const originalCream = store.dairy.cream
    const currentKg = store.results.realBatchMassG / 1000
    const targetKg  = currentKg * 2

    store.scaleRecipe(targetKg)

    expect(store.dairy.milk).toBeCloseTo(originalMilk * 2, 1)
    expect(store.dairy.cream).toBeCloseTo(originalCream * 2, 1)
  })

  it('scales sucrose proportionally', () => {
    const store = useCalculatorStore()
    const originalSucrose = store.sugars.sucrose
    const targetKg = store.results.realBatchMassG / 1000 * 0.5

    store.scaleRecipe(targetKg)

    expect(store.sugars.sucrose).toBeCloseTo(originalSucrose * 0.5, 0)
  })

  it('does NOT change milkFat or creamFat', () => {
    const store = useCalculatorStore()
    const originalMilkFat  = store.dairy.milkFat
    const originalCreamFat = store.dairy.creamFat

    store.scaleRecipe(store.results.realBatchMassG / 1000 * 2)

    expect(store.dairy.milkFat).toBe(originalMilkFat)
    expect(store.dairy.creamFat).toBe(originalCreamFat)
  })

  it('does NOT change cost fields', () => {
    const store = useCalculatorStore()
    const originalMilkCost = store.costs.milk

    store.scaleRecipe(store.results.realBatchMassG / 1000 * 3)

    expect(store.costs.milk).toBe(originalMilkCost)
  })

  it('composition metrics are invariant after scaling', () => {
    const store = useCalculatorStore()
    // Zero batch additions: they're added to the fixed 5000g normalized base,
    // so proportional scaling of non-zero values shifts their ratio slightly.
    store.batchAdditions.bDex  = 0
    store.batchAdditions.bGluc = 0
    const pacBefore = store.results.pac
    const fatBefore = store.results.fatPct

    store.scaleRecipe(store.results.realBatchMassG / 1000 * 1.5)

    expect(store.results.pac).toBeCloseTo(pacBefore, 1)
    expect(store.results.fatPct).toBeCloseTo(fatBefore, 1)
  })

  it('does nothing when targetKg is 0', () => {
    const store = useCalculatorStore()
    const originalMilk = store.dairy.milk

    store.scaleRecipe(0)

    expect(store.dairy.milk).toBe(originalMilk)
  })

  it('warnings computed returns an array', () => {
    const store = useCalculatorStore()
    expect(Array.isArray(store.warnings)).toBe(true)
  })
})
