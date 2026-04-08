<template>
  <div class="view-cartView">
    <h1>Cart</h1>
    <div class="view-content">
    <permission-gate />
    <social-login />
    <biometric-auth />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'
import PermissionGate from '@/components/auth/PermissionGate.vue'
import SocialLogin from '@/components/auth/SocialLogin.vue'
import BiometricAuth from '@/components/auth/BiometricAuth.vue'

const route = useRoute()
const router = useRouter()
  const notificationStore = useNotificationStore()
  const dragDrop = useDragDrop()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.get('/api/reviews')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-cartView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
