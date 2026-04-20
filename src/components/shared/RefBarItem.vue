<template>
  <div class="ref-bar-wrap">
    <div class="ref-bar-label">
      <span>{{ label }}</span>
      <span class="ideal-range">{{ lo }}–{{ hi }}{{ unit }}</span>
    </div>
    <div class="ref-bar-track">
      <div v-if="mLo != null" class="ref-bar-zone marginal"
        :style="{ left: margLeft + '%', width: margWidth + '%' }" />
      <div class="ref-bar-zone ideal"
        :style="{ left: idealLeft + '%', width: idealWidth + '%' }" />
    </div>
    <div class="ref-bar-desc">{{ desc }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label:    { type: String, required: true },
  trackMin: { type: Number, required: true },
  trackMax: { type: Number, required: true },
  lo:       { type: Number, required: true },
  hi:       { type: Number, required: true },
  mLo:      { type: Number, default: null },
  mHi:      { type: Number, default: null },
  unit:     { type: String, default: '' },
  desc:     { type: String, default: '' },
})

const span = computed(() => props.trackMax - props.trackMin)
const idealLeft  = computed(() => ((props.lo - props.trackMin) / span.value * 100).toFixed(1))
const idealWidth = computed(() => ((props.hi - props.lo)       / span.value * 100).toFixed(1))
const margLeft   = computed(() => props.mLo != null ? ((props.mLo - props.trackMin) / span.value * 100).toFixed(1) : 0)
const margWidth  = computed(() => props.mLo != null ? ((props.mHi - props.mLo)      / span.value * 100).toFixed(1) : 0)
</script>

<style scoped>
.ref-bar-wrap  { margin-bottom: 12px; }
.ref-bar-label { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 4px; }
.ideal-range   { color: #4aff9e; font-weight: 600; }
.ref-bar-track { position: relative; height: 10px; background: #2a2a2a; border-radius: 5px; overflow: hidden; }
.ref-bar-zone  { position: absolute; top: 0; height: 100%; border-radius: 5px; }
.ref-bar-zone.ideal    { background: #4aff9e; opacity: 0.8; }
.ref-bar-zone.marginal { background: #ffaa4a; opacity: 0.65; }
.ref-bar-desc  { font-size: 11px; color: #666; margin-top: 3px; line-height: 1.4; }
</style>
