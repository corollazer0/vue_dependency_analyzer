<template>
  <div class="view-forbiddenView">
    <h1>Forbidden</h1>
    <div class="view-content">
    <order-return />
    <order-detail />
    <order-confirmation />
    <order-refund />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAsync } from '@/composables/useAsync'
import axios from 'axios'
import OrderReturn from '@/components/order/OrderReturn.vue'
import OrderDetail from '@/components/order/OrderDetail.vue'
import OrderConfirmation from '@/components/order/OrderConfirmation.vue'
import OrderRefund from '@/components/order/OrderRefund.vue'

const route = useRoute()
const router = useRouter()
  const notificationStore = useNotificationStore()
  const async = useAsync()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.post('/api/products')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-forbiddenView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
