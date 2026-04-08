<template>
  <div class="view-orderListView">
    <h1>OrderList</h1>
    <div class="view-content">
    <order-filter />
    <order-history />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/categoryStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import OrderFilter from '@/components/order/OrderFilter.vue'
import OrderHistory from '@/components/order/OrderHistory.vue'

const route = useRoute()
const router = useRouter()
  const categoryStore = useCategoryStore()
  const keyboard = useKeyboard()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get('/api/orders')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-orderListView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
