<template>
  <div class="common-searchBar">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-notification />
    <activity-feed />
    <product-brand />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAuth } from '@/composables/useAuth'
import { useUser } from '@/composables/useUser'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import OrderNotification from '@/components/order/OrderNotification.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import ProductBrand from '@/components/product/ProductBrand.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const authStore = useAuthStore()
  const categoryStore = useCategoryStore()
  const auth = useAuth()
  const user = useUser()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/notifications/${id}/read`)
    const response = await axios.get('/api/notifications')
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
.common-searchBar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
