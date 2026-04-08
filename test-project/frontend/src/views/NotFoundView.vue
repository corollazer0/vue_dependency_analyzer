<template>
  <div class="view-notFoundView">
    <h1>NotFound</h1>
    <div class="view-content">
    <order-print />
    <order-tracking />
    <order-payment />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import OrderPrint from '@/components/order/OrderPrint.vue'
import OrderTracking from '@/components/order/OrderTracking.vue'
import OrderPayment from '@/components/order/OrderPayment.vue'

const route = useRoute()
const router = useRouter()
  const settingsStore = useSettingsStore()
  const cart = useCart()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.put(`/api/orders/${route.params.id}/status`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-notFoundView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
