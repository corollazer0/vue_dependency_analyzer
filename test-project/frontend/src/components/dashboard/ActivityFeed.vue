<template>
  <div class="dashboard-activityFeed">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <metric-card />
    <base-tabs />
    <two-factor-verify />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import MetricCard from '@/components/dashboard/MetricCard.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import TwoFactorVerify from '@/components/auth/TwoFactorVerify.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const userStore = useUserStore()


  const search = useSearch()
  provide('config', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/analytics/conversions')
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
.dashboard-activityFeed {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
