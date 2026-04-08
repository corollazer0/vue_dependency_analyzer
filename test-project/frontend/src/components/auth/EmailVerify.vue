<template>
  <div class="auth-emailVerify">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-payment />
    <user-card />
    <user-groups />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useUserStore } from '@/stores/userStore'
import { usePermission } from '@/composables/usePermission'
import { useDebounce } from '@/composables/useDebounce'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import OrderPayment from '@/components/order/OrderPayment.vue'
import UserCard from '@/components/user/UserCard.vue'
import UserGroups from '@/components/user/UserGroups.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const searchStore = useSearchStore()
  const userStore = useUserStore()
  const permission = usePermission()
  const debounce = useDebounce()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
    const response = await axios.post('/api/auth/logout')
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
.auth-emailVerify {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
