<template>
  <div class="ref-bar-wrap">
    <div class="ref-bar-label">
      <span>{{ label }}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span v-if="value != null" :class="valueColor" class="current-val">{{ value.toFixed(1) }}{{ unit }}</span>
        <span class="ideal-range">{{ lo }}–{{ hi }}{{ unit }}</span>
      </div>
    </div>
    <div class="ref-bar-track">
      <div v-if="mLo != null" class="ref-bar-zone marginal"
        :style="{ left: margLeft + '%', width: margWidth + '%' }" />
      <div class="ref-bar-zone ideal"
        :style="{ left: idealLeft + '%', width: idealWidth + '%' }" />
      <div v-if="value != null" class="value-marker" :style="{ left: markerLeft + '%' }" />
    </div>
    <div class="ref-bar-desc">{{ desc }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label:    { type: String,  required: true },
  trackMin: { type: Number,  required: true },
  trackMax: { type: Number,  required: true },
  lo:       { type: Number,  required: true },
  hi:       { type: Number,  required: true },
  mLo:      { type: Number,  default: null },
  mHi:      { type: Number,  default: null },
  unit:     { type: String,  default: '' },
  desc:     { type: String,  default: '' },
  value:    { type: Number,  default: null },
})

const span = computed(() => props.trackMax - props.trackMin)
const idealLeft  = computed(() => ((props.lo - props.trackMin) / span.value * 100).toFixed(1))
const idealWidth = computed(() => ((props.hi - props.lo)       / span.value * 100).toFixed(1))
const margLeft   = computed(() => props.mLo != null ? ((props.mLo - props.trackMin) / span.value * 100).toFixed(1) : 0)
const margWidth  = computed(() => props.mLo != null ? ((props.mHi - props.mLo)      / span.value * 100).toFixed(1) : 0)
const markerLeft = computed(() => {
  if (props.value == null) return 0
  return Math.max(0, Math.min(100, (props.value - props.trackMin) / span.value * 100)).toFixed(1)
})
const valueColor = computed(() => {
  if (props.value == null) return ''
  if (props.value >= props.lo && props.value <= props.hi) return 'val-ok'
  if (props.mLo != null && props.value >= props.mLo && props.value < props.lo) return 'val-warn'
  if (props.mHi != null && props.value > props.hi && props.value <= props.mHi) return 'val-warn'
  return 'val-bad'
})
</script>

<style scoped>
.ref-bar-wrap  { margin-bottom: 14px; }
.ref-bar-label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #aaa; margin-bottom: 4px; }
.ideal-range   { color: #555; font-size: 11px; }
.current-val   { font-weight: 700; font-size: 13px; }
.val-ok   { color: #4aff9e; }
.val-warn { color: #ffaa4a; }
.val-bad  { color: #ff6b6b; }
.ref-bar-track { position: relative; height: 10px; background: #2a2a2a; border-radius: 5px; overflow: visible; }
.ref-bar-zone  { position: absolute; top: 0; height: 100%; border-radius: 5px; }
.ref-bar-zone.ideal    { background: #4aff9e; opacity: 0.8; }
.ref-bar-zone.marginal { background: #ffaa4a; opacity: 0.65; }
.value-marker {
  position: absolute; top: -3px; width: 3px; height: 16px;
  background: #fff; border-radius: 2px;
  transform: translateX(-50%);
  box-shadow: 0 0 4px rgba(255,255,255,0.6);
}
.ref-bar-desc  { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.4; }
</style>
