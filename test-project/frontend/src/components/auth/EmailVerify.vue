<template>
  <div class="auth-emailVerify">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-review />
    <order-filter />
    <user-card />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useProductStore } from '@/stores/productStore'
import { usePermission } from '@/composables/usePermission'
import { useAuth } from '@/composables/useAuth'
import { validators } from '@/utils/validators'
import axios from 'axios'
import OrderReview from '@/components/order/OrderReview.vue'
import OrderFilter from '@/components/order/OrderFilter.vue'
import UserCard from '@/components/user/UserCard.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select', 'close'])

  const couponStore = useCouponStore()
  const productStore = useProductStore()


  const permission = usePermission()
  const auth = useAuth()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/products')
    const response1 = await axios.delete(`/api/users/${props.id}`)
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
.auth-emailVerify {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
