<template>
  <div class="view-productDetailView">
    <h1>ProductDetail</h1>
    <div class="view-content">
    <auth-guard />
    <permission-gate />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/searchStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'
import AuthGuard from '@/components/auth/AuthGuard.vue'
import PermissionGate from '@/components/auth/PermissionGate.vue'

const route = useRoute()
const router = useRouter()
  const searchStore = useSearchStore()
  const debounce = useDebounce()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.post('/api/auth/logout')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-productDetailView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
