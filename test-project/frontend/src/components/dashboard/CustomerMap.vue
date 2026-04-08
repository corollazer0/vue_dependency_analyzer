<template>
  <div class="dashboard-customerMap">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ip-whitelist />
    <filter-panel />
    <base-card />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'
import { useAuth } from '@/composables/useAuth'
import { useDebounce } from '@/composables/useDebounce'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import BaseCard from '@/components/common/BaseCard.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'submit'])

  const notificationStore = useNotificationStore()
  const userStore = useUserStore()
  const auth = useAuth()
  const debounce = useDebounce()

  const loggerValue = inject('logger')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    const response = await axios.post('/api/orders')
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
.dashboard-customerMap {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
