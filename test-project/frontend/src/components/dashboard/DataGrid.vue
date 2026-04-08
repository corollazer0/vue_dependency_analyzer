<template>
  <div class="dashboard-dataGrid">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-card />
    <trusted-devices />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useGeolocation } from '@/composables/useGeolocation'
import axios from 'axios'
import UserCard from '@/components/user/UserCard.vue'
import TrustedDevices from '@/components/auth/TrustedDevices.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const authStore = useAuthStore()
  const geolocation = useGeolocation()
  provide('config', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/notifications')
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
.dashboard-dataGrid {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
