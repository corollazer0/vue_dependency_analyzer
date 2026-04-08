<template>
  <div class="auth-registerForm">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-deletion />
    <radar-chart />
    <social-login />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useDragDrop } from '@/composables/useDragDrop'
import { useOrder } from '@/composables/useOrder'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import UserDeletion from '@/components/user/UserDeletion.vue'
import RadarChart from '@/components/dashboard/RadarChart.vue'
import SocialLogin from '@/components/auth/SocialLogin.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

  const productStore = useProductStore()
  const cartStore = useCartStore()


  const dragDrop = useDragDrop()
  const order = useOrder()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/products')
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
.auth-registerForm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
