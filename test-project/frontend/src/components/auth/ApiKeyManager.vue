<template>
  <div class="auth-apiKeyManager">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useCouponStore } from '@/stores/couponStore'
import { useWebSocket } from '@/composables/useWebSocket'
import { useFilter } from '@/composables/useFilter'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const notificationStore = useNotificationStore()
  const couponStore = useCouponStore()


  const webSocket = useWebSocket()
  const filter = useFilter()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
    const response1 = await axios.get(`/api/products/${props.id}`)
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
.auth-apiKeyManager {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
