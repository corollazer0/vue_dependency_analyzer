<template>
  <div class="product-productSearch">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-history />
    <product-inventory />
    <order-status />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { useFetch } from '@/composables/useFetch'
import { useDarkMode } from '@/composables/useDarkMode'
import { analytics } from '@/services/analytics'
import axios from 'axios'
import AuthHistory from '@/components/auth/AuthHistory.vue'
import ProductInventory from '@/components/product/ProductInventory.vue'
import OrderStatus from '@/components/order/OrderStatus.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'submit'])

  const settingsStore = useSettingsStore()
  const userStore = useUserStore()
  const fetch = useFetch()
  const darkMode = useDarkMode()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response = await axios.get(`/api/users/${id}`)
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
.product-productSearch {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
