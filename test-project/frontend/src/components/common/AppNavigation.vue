<template>
  <div class="common-appNavigation">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-sort />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useOrderStore } from '@/stores/orderStore'
import { useThrottle } from '@/composables/useThrottle'
import { useDebounce } from '@/composables/useDebounce'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import ProductSort from '@/components/product/ProductSort.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close', 'delete'])

  const reviewStore = useReviewStore()
  const orderStore = useOrderStore()
  const throttle = useThrottle()
  const debounce = useDebounce()
  provide('eventBus', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/search')
    const response = await axios.get('/api/wishlist')
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
.common-appNavigation {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
