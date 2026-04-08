<template>
  <div class="dashboard-dashboardStats">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <recent-orders />
    <role-guard />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'
import RoleGuard from '@/components/auth/RoleGuard.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()
  const analyticsStore = useAnalyticsStore()
  const { items, count } = storeToRefs(analyticsStore)

  const product = useProduct()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/logout')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}




onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-dashboardStats {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
