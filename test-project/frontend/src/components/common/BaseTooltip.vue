<template>
  <div class="common-baseTooltip">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-navigation />
    <dashboard-stats />
    <captcha-widget />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAsync } from '@/composables/useAsync'
import axios from 'axios'
import AppNavigation from '@/components/common/AppNavigation.vue'
import DashboardStats from '@/components/dashboard/DashboardStats.vue'
import CaptchaWidget from '@/components/auth/CaptchaWidget.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  loading: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const settingsStore = useSettingsStore()
  const async = useAsync()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/wishlist')
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
.common-baseTooltip {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
