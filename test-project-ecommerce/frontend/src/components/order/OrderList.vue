<script setup lang="ts">
import { useOrderStore } from '@/stores/order'
import { usePagination } from '@/composables/usePagination'
import { storeToRefs } from 'pinia'
import BaseTable from './../common/BaseTable.vue'
import axios from 'axios'

const orderStore = useOrderStore()
const { orders, currentOrder } = storeToRefs(orderStore)
const { pagination } = usePagination()
async function apiCall0() {
  const res0 = await axios.get('/api/orders')
  return res0.data
}
</script>

<template>
  <div class="orderlist">
    <h2>{{ 'OrderList' }}</h2>
      <base-table @row-click="() => {}" @page-change="() => {}" />
    <div v-permission="'admin'">Admin only</div>
  </div>
</template>
