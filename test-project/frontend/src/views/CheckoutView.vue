<template>
  <div class="view-checkoutView">
    <h1>Checkout</h1>
    <div class="view-content">
    <device-list />
    <two-factor-verify />
    <login-form />
    <auth-history />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import DeviceList from '@/components/auth/DeviceList.vue'
import TwoFactorVerify from '@/components/auth/TwoFactorVerify.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import AuthHistory from '@/components/auth/AuthHistory.vue'

const route = useRoute()
const router = useRouter()
  const orderStore = useOrderStore()
  const cart = useCart()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.post('/api/wishlist')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-checkoutView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
