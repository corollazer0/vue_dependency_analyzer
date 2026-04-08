<template>
  <div class="order-orderDelivery">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-drawer />
    <order-bulk-action />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import UserDrawer from '@/components/user/UserDrawer.vue'
import OrderBulkAction from '@/components/order/OrderBulkAction.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const authStore = useAuthStore()
  const product = useProduct()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.order-orderDelivery {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
