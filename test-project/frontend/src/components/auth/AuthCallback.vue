<template>
  <div class="auth-authCallback">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <sort-select />
    <order-print />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useCart } from '@/composables/useCart'
import { useUser } from '@/composables/useUser'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import SortSelect from '@/components/common/SortSelect.vue'
import OrderPrint from '@/components/order/OrderPrint.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const uIStore = useUIStore()
  const inventoryStore = useInventoryStore()


  const cart = useCart()
  const user = useUser()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/analytics/conversions')
    const response1 = await axios.get('/api/search')
    data.value = response1.data
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
.auth-authCallback {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
