<template>
  <div class="row">
    <span class="label-text">{{ label }}</span>
    <div style="display:flex;align-items:center;gap:6px;">
      <span v-if="hint" class="dim">{{ hint }}</span>
      <input
        type="number"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :style="{ width: width }"
        @input="$emit('update:modelValue', parseFloat($event.target.value) || 0)"
      />
      <span v-if="unit" class="dim" style="min-width:20px;">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label:      { type: String, required: true },
  modelValue: { type: Number, default: 0 },
  unit:       { type: String, default: '' },
  hint:       { type: String, default: '' },
  min:        { type: Number, default: 0 },
  max:        { type: Number, default: 999999 },
  step:       { type: Number, default: 1 },
  width:      { type: String, default: '80px' },
})
defineEmits(['update:modelValue'])
</script>
