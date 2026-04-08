<template>
  <div class="auth-twoFactorVerify">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-cancel />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUserStore } from '@/stores/userStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useClickOutside } from '@/composables/useClickOutside'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import OrderCancel from '@/components/order/OrderCancel.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'submit'])

  const notificationStore = useNotificationStore()
  const userStore = useUserStore()
  const breakpoint = useBreakpoint()
  const clickOutside = useClickOutside()
  provide('locale', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.get(`/api/users/${id}`)
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
.auth-twoFactorVerify {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
