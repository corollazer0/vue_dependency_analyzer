<template>
  <div class="product-productList">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <filter-panel @filter-change="handleFilterChange" @reset="handleReset" />
    <product-tag />
    <dashboard-stats />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useAuth } from '@/composables/useAuth'
import { useDebounce } from '@/composables/useDebounce'
import { constants } from '@/utils/constants'
import axios from 'axios'
import FilterPanel from '@/components/common/FilterPanel.vue'
import ProductTag from '@/components/product/ProductTag.vue'
import DashboardStats from '@/components/dashboard/DashboardStats.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const analyticsStore = useAnalyticsStore()
  const reviewStore = useReviewStore()


  const auth = useAuth()
  const debounce = useDebounce()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/cart')
    const response1 = await axios.post('/api/auth/logout')
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

  function handleFilterChange() {
    console.log('filter-change event received')
  }

  function handleReset() {
    console.log('reset event received')
  }


onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.product-productList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
