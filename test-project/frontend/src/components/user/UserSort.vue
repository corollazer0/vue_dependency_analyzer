<template>
  <div class="user-userSort">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <two-factor-setup />
    <base-tooltip />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAsync } from '@/composables/useAsync'
import { validators } from '@/utils/validators'
import axios from 'axios'
import TwoFactorSetup from '@/components/auth/TwoFactorSetup.vue'
import BaseTooltip from '@/components/common/BaseTooltip.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const notificationStore = useNotificationStore()
  const userStore = useUserStore()


  const webSocket = useWebSocket()
  const async = useAsync()

  const configValue = inject('config')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/orders')
    const response1 = await axios.get('/api/inventory')
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
.user-userSort {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
