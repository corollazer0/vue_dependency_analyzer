<template>
  <div class="dashboard-revenueChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-pagination />
    <login-form />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useOrderStore } from '@/stores/orderStore'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/composables/useAuth'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import UserPagination from '@/components/user/UserPagination.vue'
import LoginForm from '@/components/auth/LoginForm.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const toast = useToast()
  const auth = useAuth()
  provide('permissions', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/analytics/traffic')
    const response = await axios.get('/api/coupons')
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
.dashboard-revenueChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
