<template>
  <span class="badge" :class="statusClass">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  value: { type: Number, required: true },
  low:   { type: Number, required: true },
  high:  { type: Number, required: true },
})
const statusClass = computed(() => {
  if (props.value < props.low)  return 'badge--low'
  if (props.value > props.high) return 'badge--high'
  return 'badge--ok'
})
const label = computed(() => {
  if (props.value < props.low)  return 'ΧΑΜΗΛΟ'
  if (props.value > props.high) return 'ΥΨΗΛΟ'
  return '✓ ΣΩΣΤΟ'
})
</script>

<style scoped>
.badge { display: inline-block; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
.badge--ok   { background: #28c840; color: #fff; }
.badge--low  { background: #febc2e; color: #000; }
.badge--high { background: #ff5f57; color: #fff; }
</style>
