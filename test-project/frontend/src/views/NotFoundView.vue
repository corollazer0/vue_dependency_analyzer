<template>
  <div class="view-notFoundView">
    <h1>NotFound</h1>
    <div class="view-content">
    <base-badge />
    <confirm-dialog />
    <loading-overlay />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/uIStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import BaseBadge from '@/components/common/BaseBadge.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const route = useRoute()
const router = useRouter()
  const uIStore = useUIStore()
  const product = useProduct()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.get('/api/coupons')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-notFoundView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
