<template>
  <div class="dashboard-funnelChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-preferences />
    <order-pickup />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useProduct } from '@/composables/useProduct'
import { storage } from '@/services/storage'
import axios from 'axios'
import UserPreferences from '@/components/user/UserPreferences.vue'
import OrderPickup from '@/components/order/OrderPickup.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const settingsStore = useSettingsStore()
  const wishlistStore = useWishlistStore()
  const breakpoint = useBreakpoint()
  const product = useProduct()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
    const response = await axios.get('/api/products')
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
.dashboard-funnelChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
