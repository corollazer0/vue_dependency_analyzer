<template>
  <div class="order-orderTimeline">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <password-strength />
    <security-log />
    <app-breadcrumb />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useFetch } from '@/composables/useFetch'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import PasswordStrength from '@/components/auth/PasswordStrength.vue'
import SecurityLog from '@/components/auth/SecurityLog.vue'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const notificationStore = useNotificationStore()
  const wishlistStore = useWishlistStore()
  const mediaQuery = useMediaQuery()
  const fetch = useFetch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/orders/${id}`)
    const response = await axios.put('/api/settings')
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
.order-orderTimeline {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
