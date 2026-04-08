<template>
  <div class="user-userList">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-breadcrumb />
    <trend-indicator />
    <trusted-devices />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import axios from 'axios'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
import TrendIndicator from '@/components/dashboard/TrendIndicator.vue'
import TrustedDevices from '@/components/auth/TrustedDevices.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const analyticsStore = useAnalyticsStore()
  const breakpoint = useBreakpoint()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
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
.user-userList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
