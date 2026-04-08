<template>
  <div class="user-userModal">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-table />
    <order-pickup />
    <auth-error />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useCartStore } from '@/stores/cartStore'
import { useFetch } from '@/composables/useFetch'
import { useOrder } from '@/composables/useOrder'
import { users } from '@/api/users'
import axios from 'axios'
import OrderTable from '@/components/order/OrderTable.vue'
import OrderPickup from '@/components/order/OrderPickup.vue'
import AuthError from '@/components/auth/AuthError.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const searchStore = useSearchStore()
  const cartStore = useCartStore()
  const fetch = useFetch()
  const order = useOrder()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/notifications')
    const response = await axios.post('/api/products')
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
.user-userModal {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
