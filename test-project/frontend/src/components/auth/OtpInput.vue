<template>
  <div class="auth-otpInput">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-notifications />
    <order-delivery />
    <user-profile />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import UserNotifications from '@/components/user/UserNotifications.vue'
import OrderDelivery from '@/components/order/OrderDelivery.vue'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const uIStore = useUIStore()


  const product = useProduct()
  provide('config', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/products')
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
.auth-otpInput {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
