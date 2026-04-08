<template>
  <div class="auth-rateLimitBanner">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-grid />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSearchStore } from '@/stores/searchStore'
import { usePagination } from '@/composables/usePagination'
import { useWebSocket } from '@/composables/useWebSocket'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductGrid from '@/components/product/ProductGrid.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select', 'close'])

  const userStore = useUserStore()
  const searchStore = useSearchStore()
  const pagination = usePagination()
  const webSocket = useWebSocket()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/inventory/${id}`)
    const response = await axios.get('/api/analytics/traffic')
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
.auth-rateLimitBanner {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
