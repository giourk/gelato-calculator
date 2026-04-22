<template>
  <div v-if="warnings.length > 0" class="warning-banner">
    <div v-for="w in warnings" :key="w.metric" class="warning-line">
      {{ w.message }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  warnings: { type: Array, required: true },
})
</script>

<style scoped>
.warning-banner {
  background: #2a1e00;
  border: 1px solid #b8860b;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 10px;
}
.warning-line {
  color: #ffd700;
  font-size: 12px;
  line-height: 1.8;
}
</style>
