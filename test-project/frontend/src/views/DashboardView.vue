<template>
  <div class="view-dashboardView">
    <h1>Dashboard</h1>
    <div class="view-content">
    <order-stats />
    <order-timeline />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAsync } from '@/composables/useAsync'
import axios from 'axios'
import OrderStats from '@/components/order/OrderStats.vue'
import OrderTimeline from '@/components/order/OrderTimeline.vue'

const route = useRoute()
const router = useRouter()
  const notificationStore = useNotificationStore()
  const async = useAsync()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.post('/api/coupons/validate')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-dashboardView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
