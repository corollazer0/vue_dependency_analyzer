<template>
  <div class="auth-authCallback">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-quick-view />
    <user-bio />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useProductStore } from '@/stores/productStore'
import { useClipboard } from '@/composables/useClipboard'
import { useNotification } from '@/composables/useNotification'
import { eventBus } from '@/services/eventBus'
import axios from 'axios'
import ProductQuickView from '@/components/product/ProductQuickView.vue'
import UserBio from '@/components/user/UserBio.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['close', 'delete'])

  const notificationStore = useNotificationStore()
  const productStore = useProductStore()
  const clipboard = useClipboard()
  const notification = useNotification()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/revenue')
    const response = await axios.get('/api/analytics/traffic')
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
.auth-authCallback {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
