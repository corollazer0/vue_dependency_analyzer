<template>
  <div class="view-cartView">
    <h1>Cart</h1>
    <div class="view-content">
    <dashboard-stats />
    <recent-orders />
    <trend-indicator />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/searchStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import DashboardStats from '@/components/dashboard/DashboardStats.vue'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'
import TrendIndicator from '@/components/dashboard/TrendIndicator.vue'

const route = useRoute()
const router = useRouter()
  const searchStore = useSearchStore()
  const cart = useCart()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.delete(`/api/cart/items/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-cartView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
