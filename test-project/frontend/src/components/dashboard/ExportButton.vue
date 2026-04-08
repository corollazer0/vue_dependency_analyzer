<template>
  <div class="dashboard-exportButton">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-history />
    <product-tag />
    <order-summary />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import OrderHistory from '@/components/order/OrderHistory.vue'
import ProductTag from '@/components/product/ProductTag.vue'
import OrderSummary from '@/components/order/OrderSummary.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'update'])

  const notificationStore = useNotificationStore()
  const userStore = useUserStore()


  const geolocation = useGeolocation()
  const infiniteScroll = useInfiniteScroll()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/reviews')
    const response1 = await axios.get(`/api/users/${props.id}`)
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
.dashboard-exportButton {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
