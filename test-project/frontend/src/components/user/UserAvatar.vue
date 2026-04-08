<template>
  <div class="user-userAvatar">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <role-guard />
    <product-discount />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useCartStore } from '@/stores/cartStore'
import { useOrder } from '@/composables/useOrder'
import { useGeolocation } from '@/composables/useGeolocation'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import RoleGuard from '@/components/auth/RoleGuard.vue'
import ProductDiscount from '@/components/product/ProductDiscount.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const searchStore = useSearchStore()
  const cartStore = useCartStore()
  const order = useOrder()
  const geolocation = useGeolocation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/coupons')
    const response = await axios.get('/api/users')
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
.user-userAvatar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
