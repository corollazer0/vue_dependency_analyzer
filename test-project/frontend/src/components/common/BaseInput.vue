<template>
  <div class="common-baseInput">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <mini-chart />
    <user-list />
    <order-print />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAuth } from '@/composables/useAuth'
import { useValidation } from '@/composables/useValidation'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import MiniChart from '@/components/dashboard/MiniChart.vue'
import UserList from '@/components/user/UserList.vue'
import OrderPrint from '@/components/order/OrderPrint.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const authStore = useAuthStore()
  const inventoryStore = useInventoryStore()
  const auth = useAuth()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response = await axios.put(`/api/orders/${id}/status`)
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
.common-baseInput {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
