<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import axios from 'axios'

const { isLoggedIn, login, logout } = useAuth()
const router = useRouter()
function navigate() { router.push('/dashboard') }
async function apiCall0() {
  const res0 = await axios.post('/api/auth/login', {})
  return res0.data
}
function nativeAction0() {
  window.NativeApp.requestBiometric()
}
</script>

<template>
  <div class="loginpage">
    <h2>{{ 'LoginPage' }}</h2>


  </div>
</template>
