<template>
  <div class="auth-ipWhitelist">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-review />
    <base-chip />
    <order-chart />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import ProductReview from '@/components/product/ProductReview.vue'
import BaseChip from '@/components/common/BaseChip.vue'
import OrderChart from '@/components/order/OrderChart.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const settingsStore = useSettingsStore()


  const fetch = useFetch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/orders')
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
.auth-ipWhitelist {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
