<template>
  <div class="view-productDetailView">
    <h1>ProductDetail</h1>
    <div class="view-content">
    <sso-login />
    <otp-input />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import SsoLogin from '@/components/auth/SsoLogin.vue'
import OtpInput from '@/components/auth/OtpInput.vue'

const route = useRoute()
const router = useRouter()
  const authStore = useAuthStore()
  const auth = useAuth()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.get('/api/products')
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
