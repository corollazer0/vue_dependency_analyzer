<script setup lang="ts">
import { useOrderStore } from '@/stores/order'
import { storeToRefs } from 'pinia'
import OrderTimeline from './OrderTimeline.vue'
import OrderItems from './OrderItems.vue'
import OrderShipping from './OrderShipping.vue'
import OrderPayment from './OrderPayment.vue'
import axios from 'axios'

const orderStore = useOrderStore()
const { orders, currentOrder } = storeToRefs(orderStore)
async function apiCall0() {
  const res0 = await axios.get('/api/orders/:id')
  return res0.data
}
</script>

<template>
  <div class="orderdetail">
    <h2>{{ 'OrderDetail' }}</h2>
      <order-timeline @status-change="() => {}" />
      <order-items />
      <order-shipping />
      <order-payment @refund-requested="() => {}" />

  </div>
</template>
