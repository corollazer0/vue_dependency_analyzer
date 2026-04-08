<template>
  <div class="common-datePicker">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-import />
    <product-analytics />
    <order-export />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useClipboard } from '@/composables/useClipboard'
import axios from 'axios'
import ProductImport from '@/components/product/ProductImport.vue'
import ProductAnalytics from '@/components/product/ProductAnalytics.vue'
import OrderExport from '@/components/order/OrderExport.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  loading: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const uIStore = useUIStore()
  const clipboard = useClipboard()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/cart/items')
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
.common-datePicker {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
