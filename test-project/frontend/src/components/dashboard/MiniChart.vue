<template>
  <div class="dashboard-miniChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <sso-login />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useDragDrop } from '@/composables/useDragDrop'
import { useDarkMode } from '@/composables/useDarkMode'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import SsoLogin from '@/components/auth/SsoLogin.vue'

const props = defineProps({
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const productStore = useProductStore()
  const cartStore = useCartStore()
  const dragDrop = useDragDrop()
  const darkMode = useDarkMode()

  const permissionsValue = inject('permissions')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}`)
    const response = await axios.post(`/api/orders/${id}/cancel`)
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
.dashboard-miniChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
