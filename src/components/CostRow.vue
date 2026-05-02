<template>
  <div class="cost-row">
    <span class="cost-row-label label-text">{{ label }}</span>
    <span class="cost-row-unit dim" style="font-size:10px;">{{ unit }}</span>
    <span class="cost-row-default dim" style="font-size:11px;text-align:right;">{{ defaultVal.toFixed(2) }}</span>
    <input
      type="number"
      min="0"
      step="0.01"
      class="cost-row-input"
      :class="{ customized: isCustomized }"
      :value="modelValue"
      @change="emit('update:modelValue', parseFloat($event.target.value) || 0)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label:      { type: String,  required: true },
  unit:       { type: String,  default: '€/kg' },
  defaultVal: { type: Number,  default: 0 },
  modelValue: { type: Number,  default: 0 },
})

const emit = defineEmits(['update:modelValue'])

const isCustomized = computed(() =>
  Math.abs((props.modelValue ?? 0) - props.defaultVal) > 0.001
)
</script>

<style scoped>
.cost-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  border-bottom: 1px solid #1e1e1e;
}
.cost-row:last-child { border-bottom: none; }
.cost-row-label  { flex: 1; font-size: 12px; }
.cost-row-unit   { width: 34px; font-size: 9px; color: #444; }
.cost-row-default {
  width: 52px;
  font-size: 11px;
  color: #444;
  text-align: right;
}
.cost-row-input {
  width: 72px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 5px;
  color: #fff;
  padding: 4px 6px;
  font-size: 12px;
  text-align: right;
}
.cost-row-input.customized {
  border-color: #b45309;
  background: #1f1600;
  color: #fbbf24;
}
</style>
