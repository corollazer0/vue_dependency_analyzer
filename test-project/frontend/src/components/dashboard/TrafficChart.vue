<template>
  <div class="dashboard-trafficChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <reset-password />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useOrderStore } from '@/stores/orderStore'
import { useNotification } from '@/composables/useNotification'
import { useTheme } from '@/composables/useTheme'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import ResetPassword from '@/components/auth/ResetPassword.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const notification = useNotification()
  const theme = useTheme()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.get('/api/inventory')
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
.dashboard-trafficChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
