<template>
  <div class="view-adminView">
    <h1>Admin</h1>
    <div class="view-content">
    <order-label />
    <order-table />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCouponStore } from '@/stores/couponStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'
import OrderLabel from '@/components/order/OrderLabel.vue'
import OrderTable from '@/components/order/OrderTable.vue'

const route = useRoute()
const router = useRouter()
  const couponStore = useCouponStore()
  const dragDrop = useDragDrop()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.post('/api/products')
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
