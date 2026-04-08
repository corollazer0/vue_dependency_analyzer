<template>
  <div class="auth-permissionGate">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-history />
    <product-quick-view />
    <user-list />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useOrder } from '@/composables/useOrder'
import { useTheme } from '@/composables/useTheme'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import AuthHistory from '@/components/auth/AuthHistory.vue'
import ProductQuickView from '@/components/product/ProductQuickView.vue'
import UserList from '@/components/user/UserList.vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const analyticsStore = useAnalyticsStore()
  const inventoryStore = useInventoryStore()


  const order = useOrder()
  const theme = useTheme()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response1 = await axios.get('/api/categories')
    data.value = response1.data
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
.auth-permissionGate {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
