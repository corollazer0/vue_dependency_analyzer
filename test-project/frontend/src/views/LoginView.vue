<template>
  <div class="view-loginView">
    <h1>Login</h1>
    <div class="view-content">
    <trusted-devices />
    <security-log />
    <api-key-manager />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/uIStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from 'axios'
import TrustedDevices from '@/components/auth/TrustedDevices.vue'
import SecurityLog from '@/components/auth/SecurityLog.vue'
import ApiKeyManager from '@/components/auth/ApiKeyManager.vue'

const route = useRoute()
const router = useRouter()
  const uIStore = useUIStore()
  const webSocket = useWebSocket()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.post('/api/orders')
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
