<template>
  <div class="dashboard-sparkLine">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-filter />
    <user-merge />
    <product-wishlist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import axios from 'axios'
import DashboardFilter from '@/components/dashboard/DashboardFilter.vue'
import UserMerge from '@/components/user/UserMerge.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const analyticsStore = useAnalyticsStore()
  const breakpoint = useBreakpoint()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/orders/${id}/cancel`)
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-sparkLine {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
