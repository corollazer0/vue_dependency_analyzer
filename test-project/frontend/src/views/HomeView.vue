<template>
  <div class="view-homeView">
    <h1>Home</h1>
    <div class="view-content">
    <dashboard-widget />
    <metric-card />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'

const route = useRoute()
const router = useRouter()
  const notificationStore = useNotificationStore()
  const search = useSearch()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get(`/api/orders/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-homeView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
