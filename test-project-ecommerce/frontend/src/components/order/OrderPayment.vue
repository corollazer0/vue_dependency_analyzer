<script setup lang="ts">
import axios from 'axios'

const emit = defineEmits(['refund-requested'])
async function apiCall0() {
  const res0 = await axios.post('/api/payments/refund', {})
  return res0.data
}
</script>

<template>
  <div class="orderpayment">
    <h2>{{ 'OrderPayment' }}</h2>


  </div>
</template>
