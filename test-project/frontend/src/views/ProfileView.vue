<template>
  <div class="view-profileView">
    <h1>Profile</h1>
    <div class="view-content">
    <auth-error />
    <security-log />
    <auth-guard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'
import AuthError from '@/components/auth/AuthError.vue'
import SecurityLog from '@/components/auth/SecurityLog.vue'
import AuthGuard from '@/components/auth/AuthGuard.vue'

const route = useRoute()
const router = useRouter()
  const productStore = useProductStore()
  const clickOutside = useClickOutside()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.put(`/api/products/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-profileView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
