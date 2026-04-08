<template>
  <div class="user-userTags">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-discount />
    <order-summary />
    <order-feedback />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { usePagination } from '@/composables/usePagination'
import { useNotification } from '@/composables/useNotification'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductDiscount from '@/components/product/ProductDiscount.vue'
import OrderSummary from '@/components/order/OrderSummary.vue'
import OrderFeedback from '@/components/order/OrderFeedback.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const pagination = usePagination()
  const notification = useNotification()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
    const response1 = await axios.get('/api/wishlist')
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
.user-userTags {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
