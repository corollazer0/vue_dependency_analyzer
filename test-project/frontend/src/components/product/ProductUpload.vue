<template>
  <div class="product-productUpload">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    <sales-chart />
    <product-table />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCouponStore } from '@/stores/couponStore'
import { useClipboard } from '@/composables/useClipboard'
import { useAuth } from '@/composables/useAuth'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import ProductTable from '@/components/product/ProductTable.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const userStore = useUserStore()
  const couponStore = useCouponStore()


  const clipboard = useClipboard()
  const auth = useAuth()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/cart/items')
    const response1 = await axios.put(`/api/orders/${props.id}/status`)
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
.product-productUpload {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
