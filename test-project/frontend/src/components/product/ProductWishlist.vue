<template>
  <div class="product-productWishlist">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-table />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCouponStore } from '@/stores/couponStore'
import { useCart } from '@/composables/useCart'
import { useProduct } from '@/composables/useProduct'
import { users } from '@/api/users'
import axios from 'axios'
import DashboardTable from '@/components/dashboard/DashboardTable.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['change', 'delete'])

  const userStore = useUserStore()
  const couponStore = useCouponStore()
  const cart = useCart()
  const product = useProduct()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/settings')
    const response = await axios.get('/api/inventory')
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
.product-productWishlist {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
