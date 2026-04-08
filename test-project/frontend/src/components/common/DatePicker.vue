<template>
  <div class="common-datePicker">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <line-chart />
    <user-roles />
    <order-notification />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import LineChart from '@/components/dashboard/LineChart.vue'
import UserRoles from '@/components/user/UserRoles.vue'
import OrderNotification from '@/components/order/OrderNotification.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const cartStore = useCartStore()


  const permission = usePermission()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/refresh')
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
.common-datePicker {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
