<template>
  <div class="order-orderBulkAction">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-analytics />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import ProductAnalytics from '@/components/product/ProductAnalytics.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const inventoryStore = useInventoryStore()


  const auth = useAuth()

  const loggerValue = inject('logger')

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
.order-orderBulkAction {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
