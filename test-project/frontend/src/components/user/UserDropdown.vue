<template>
  <div class="user-userDropdown">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-pagination />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useOrderStore } from '@/stores/orderStore'
import { useDebounce } from '@/composables/useDebounce'
import { useWebSocket } from '@/composables/useWebSocket'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import BasePagination from '@/components/common/BasePagination.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const inventoryStore = useInventoryStore()
  const orderStore = useOrderStore()
  const debounce = useDebounce()
  const webSocket = useWebSocket()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/orders/${id}/status`)
    const response = await axios.post('/api/products')
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
.user-userDropdown {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
