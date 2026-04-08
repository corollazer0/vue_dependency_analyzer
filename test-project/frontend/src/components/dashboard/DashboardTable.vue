<template>
  <div class="dashboard-dashboardTable">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <o-auth-consent />
    <order-export />
    <user-avatar />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { useProduct } from '@/composables/useProduct'
import { useAuth } from '@/composables/useAuth'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import OAuthConsent from '@/components/auth/OAuthConsent.vue'
import OrderExport from '@/components/order/OrderExport.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['select', 'change'])

  const userStore = useUserStore()
  const authStore = useAuthStore()
  const product = useProduct()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response = await axios.get('/api/users')
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
.dashboard-dashboardTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
