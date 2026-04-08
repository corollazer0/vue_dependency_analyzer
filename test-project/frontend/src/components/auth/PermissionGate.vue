<template>
  <div class="auth-permissionGate">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <recent-orders />
    <user-grid />
    <user-search />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useSearchStore } from '@/stores/searchStore'
import { useProduct } from '@/composables/useProduct'
import { useUser } from '@/composables/useUser'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'
import UserGrid from '@/components/user/UserGrid.vue'
import UserSearch from '@/components/user/UserSearch.vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change', 'delete'])

  const orderStore = useOrderStore()
  const searchStore = useSearchStore()
  const product = useProduct()
  const user = useUser()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/cart/items')
    const response = await axios.get(`/api/orders/${id}`)
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
.auth-permissionGate {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
