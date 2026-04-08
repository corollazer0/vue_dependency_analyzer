<template>
  <div class="order-orderInvoice">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-notifications />
    <user-avatar />
    <product-review />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useEventBus } from '@/composables/useEventBus'
import { useKeyboard } from '@/composables/useKeyboard'
import { client } from '@/api/client'
import axios from 'axios'
import UserNotifications from '@/components/user/UserNotifications.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import ProductReview from '@/components/product/ProductReview.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const orderStore = useOrderStore()
  const notificationStore = useNotificationStore()
  const eventBus = useEventBus()
  const keyboard = useKeyboard()
  provide('eventBus', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${id}`)
    const response = await axios.get('/api/search')
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
.order-orderInvoice {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
