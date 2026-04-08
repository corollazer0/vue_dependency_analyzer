<template>
  <div class="dashboard-lineChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    <auth-callback />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useDarkMode } from '@/composables/useDarkMode'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'
import AuthCallback from '@/components/auth/AuthCallback.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const analyticsStore = useAnalyticsStore()


  const darkMode = useDarkMode()

  const configValue = inject('config')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/categories')
    data.value = response.data
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
.dashboard-lineChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
