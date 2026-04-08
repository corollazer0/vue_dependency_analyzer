<template>
  <div class="dashboard-exportButton">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-avatar />
    <order-delivery />
    <base-skeleton />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useUserStore } from '@/stores/userStore'
import { useAuth } from '@/composables/useAuth'
import { useFilter } from '@/composables/useFilter'
import { analytics } from '@/services/analytics'
import axios from 'axios'
import BaseAvatar from '@/components/common/BaseAvatar.vue'
import OrderDelivery from '@/components/order/OrderDelivery.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['update', 'change'])

  const wishlistStore = useWishlistStore()
  const userStore = useUserStore()
  const auth = useAuth()
  const filter = useFilter()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${id}`)
    const response = await axios.get('/api/analytics/conversions')
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
.dashboard-exportButton {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
