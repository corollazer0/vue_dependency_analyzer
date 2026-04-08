<template>
  <div class="product-productCard">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <o-auth-consent />
    <order-tracking />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useUIStore } from '@/stores/uIStore'
import { useProductStore } from '@/stores/productStore'
import { useMediaQuery } from '@/composables/useMediaQuery'
import axios from 'axios'
import OAuthConsent from '@/components/auth/OAuthConsent.vue'
import OrderTracking from '@/components/order/OrderTracking.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const uIStore = useUIStore()
  const productStore = useProductStore()
  const { items, loading } = storeToRefs(productStore)
  const router = useRouter()
  const mediaQuery = useMediaQuery()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/search')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}


  function goToProduct(productId: number) { router.push(`/products/${productId}`) }

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.product-productCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
