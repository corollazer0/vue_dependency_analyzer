<script setup lang="ts">
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
function navigate() { router.push('/order-detail') }
async function apiCall0() {
  const res0 = await axios.get('/api/dashboard/recent-orders')
  return res0.data
}
</script>

<template>
  <div class="orderswidget">
    <h2>{{ 'OrdersWidget' }}</h2>


  </div>
</template>
