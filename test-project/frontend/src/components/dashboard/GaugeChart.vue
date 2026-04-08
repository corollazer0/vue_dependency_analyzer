<template>
  <div class="dashboard-gaugeChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ip-whitelist />
    <app-breadcrumb />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAsync } from '@/composables/useAsync'
import { useNotification } from '@/composables/useNotification'
import { constants } from '@/utils/constants'
import axios from 'axios'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const couponStore = useCouponStore()
  const notificationStore = useNotificationStore()
  const async = useAsync()
  const notification = useNotification()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/users/${id}`)
    const response = await axios.get('/api/analytics/traffic')
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
.dashboard-gaugeChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
