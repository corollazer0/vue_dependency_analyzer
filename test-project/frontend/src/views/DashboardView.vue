<template>
  <div class="view-dashboardView">
    <h1>Dashboard</h1>
    <div class="view-content">
    <product-review />
    <product-grid />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import { useForm } from '@/composables/useForm'
import axios from 'axios'
import ProductReview from '@/components/product/ProductReview.vue'
import ProductGrid from '@/components/product/ProductGrid.vue'

const route = useRoute()
const router = useRouter()
  const orderStore = useOrderStore()
  const form = useForm()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.delete(`/api/products/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-dashboardView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
