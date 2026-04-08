<template>
  <div class="auth-logoutConfirm">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <sso-login />
    <user-onboarding />
    <order-shipping />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'
import SsoLogin from '@/components/auth/SsoLogin.vue'
import UserOnboarding from '@/components/user/UserOnboarding.vue'
import OrderShipping from '@/components/order/OrderShipping.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const orderStore = useOrderStore()
  const notification = useNotification()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
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
.auth-logoutConfirm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
