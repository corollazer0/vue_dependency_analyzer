<template>
  <div class="auth-registerForm">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-delivery />
    <order-detail />
    <user-profile />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useUserStore } from '@/stores/userStore'
import { useToast } from '@/composables/useToast'
import { useValidation } from '@/composables/useValidation'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import OrderDelivery from '@/components/order/OrderDelivery.vue'
import OrderDetail from '@/components/order/OrderDetail.vue'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const orderStore = useOrderStore()
  const userStore = useUserStore()
  const toast = useToast()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/users/${id}`)
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
.auth-registerForm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
