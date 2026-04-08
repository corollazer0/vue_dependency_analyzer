<template>
  <div class="auth-accountLock">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-grid />
    <ip-whitelist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import UserGrid from '@/components/user/UserGrid.vue'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const analyticsStore = useAnalyticsStore()
  const auth = useAuth()



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
.auth-accountLock {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
