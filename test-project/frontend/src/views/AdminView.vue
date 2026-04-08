<template>
  <div class="view-adminView">
    <h1>Admin</h1>
    <div class="view-content">
    <order-history />
    <order-stats />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/searchStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import OrderHistory from '@/components/order/OrderHistory.vue'
import OrderStats from '@/components/order/OrderStats.vue'

const route = useRoute()
const router = useRouter()
  const searchStore = useSearchStore()
  const product = useProduct()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.get('/api/inventory')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-adminView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
