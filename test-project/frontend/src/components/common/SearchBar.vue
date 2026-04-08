<template>
  <div class="common-searchBar">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-callback />
    <user-badge />
    <rate-limit-banner />
    </div>
    <button @click="emit('search')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useFilter } from '@/composables/useFilter'
import { useAsync } from '@/composables/useAsync'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import AuthCallback from '@/components/auth/AuthCallback.vue'
import UserBadge from '@/components/user/UserBadge.vue'
import RateLimitBanner from '@/components/auth/RateLimitBanner.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['search', 'clear'])

  const inventoryStore = useInventoryStore()
  const notificationStore = useNotificationStore()


  const filter = useFilter()
  const async = useAsync()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
    const response1 = await axios.post('/api/auth/refresh')
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
.common-searchBar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
