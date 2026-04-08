<script setup lang="ts">
import axios from 'axios'

const emit = defineEmits(['status-change'])
async function apiCall0() {
  const res0 = await axios.put('/api/orders/:id/status', {})
  return res0.data
}
</script>

<template>
  <div class="ordertimeline">
    <h2>{{ 'OrderTimeline' }}</h2>


  </div>
</template>
