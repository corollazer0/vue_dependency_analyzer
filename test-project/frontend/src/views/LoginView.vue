<template>
  <div class="view-loginView">
    <h1>Login</h1>
    <div class="view-content">
    <product-bulk-edit />
    <product-form />
    <product-search />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { useEventBus } from '@/composables/useEventBus'
import axios from 'axios'
import ProductBulkEdit from '@/components/product/ProductBulkEdit.vue'
import ProductForm from '@/components/product/ProductForm.vue'
import ProductSearch from '@/components/product/ProductSearch.vue'

const route = useRoute()
const router = useRouter()
  const notificationStore = useNotificationStore()
  const eventBus = useEventBus()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get('/api/settings')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-loginView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
