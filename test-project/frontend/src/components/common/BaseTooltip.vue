<template>
  <div class="common-baseTooltip">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-delivery />
    <product-wishlist />
    <user-search />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from 'axios'
import OrderDelivery from '@/components/order/OrderDelivery.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'
import UserSearch from '@/components/user/UserSearch.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const inventoryStore = useInventoryStore()


  const webSocket = useWebSocket()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
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
.common-baseTooltip {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
