<template>
  <div class="view-orderDetailView">
    <h1>OrderDetail</h1>
    <div class="view-content">
    <base-pagination />
    <base-input />
    <file-upload />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useOrder } from '@/composables/useOrder'
import axios from 'axios'
import BasePagination from '@/components/common/BasePagination.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import FileUpload from '@/components/common/FileUpload.vue'

const route = useRoute()
const router = useRouter()
  const authStore = useAuthStore()
  const order = useOrder()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get('/api/analytics/traffic')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-orderDetailView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
