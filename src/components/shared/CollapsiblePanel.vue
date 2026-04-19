<template>
  <div>
    <div class="collapsible-trigger" @click="open = !open">
      <span class="dim">{{ label }}</span>
      <span class="dim">{{ open ? '▲' : '▼' }}</span>
    </div>
    <div v-if="open" class="collapsible-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({ label: { type: String, required: true }, initialOpen: { type: Boolean, default: false } })
const open = ref(false)
</script>

<style scoped>
.collapsible-trigger {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 10px; background: #222; border-radius: 6px; cursor: pointer; margin-top: 8px;
}
.collapsible-body { padding-top: 8px; }
</style>
