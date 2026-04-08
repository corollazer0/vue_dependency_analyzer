<template>
  <div class="order-orderNotification">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <forgot-password />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { useAuth } from '@/composables/useAuth'
import { logger } from '@/services/logger'
import axios from 'axios'
import ForgotPassword from '@/components/auth/ForgotPassword.vue'

const props = defineProps({
  items: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['change', 'submit'])

  const settingsStore = useSettingsStore()
  const userStore = useUserStore()
  const localStorage = useLocalStorage()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response = await axios.post('/api/cart/items')
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
.order-orderNotification {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
