<template>
  <div class="view-orderDetailView">
    <h1>OrderDetail</h1>
    <div class="view-content">
    <captcha-widget />
    <otp-input />
    <ldap-login />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/uIStore'
import { useMediaQuery } from '@/composables/useMediaQuery'
import axios from 'axios'
import CaptchaWidget from '@/components/auth/CaptchaWidget.vue'
import OtpInput from '@/components/auth/OtpInput.vue'
import LdapLogin from '@/components/auth/LdapLogin.vue'

const route = useRoute()
const router = useRouter()
  const uIStore = useUIStore()
  const mediaQuery = useMediaQuery()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.get(`/api/users/${route.params.id}`)
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
