<template>
  <div class="order-orderReturn">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-badge />
    <order-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'
import UserBadge from '@/components/user/UserBadge.vue'
import OrderChart from '@/components/order/OrderChart.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const uIStore = useUIStore()
  const debounce = useDebounce()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}`)
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
.order-orderReturn {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
