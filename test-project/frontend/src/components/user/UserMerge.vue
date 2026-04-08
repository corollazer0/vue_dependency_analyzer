<template>
  <div class="user-userMerge">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-summary />
    <app-navigation />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useGeolocation } from '@/composables/useGeolocation'
import { products } from '@/api/products'
import axios from 'axios'
import OrderSummary from '@/components/order/OrderSummary.vue'
import AppNavigation from '@/components/common/AppNavigation.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const settingsStore = useSettingsStore()
  const authStore = useAuthStore()


  const infiniteScroll = useInfiniteScroll()
  const geolocation = useGeolocation()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/products/${props.id}`)
    const response1 = await axios.get('/api/dashboard/revenue')
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
.user-userMerge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
