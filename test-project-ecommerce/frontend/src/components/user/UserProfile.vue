<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { storeToRefs } from 'pinia'
import axios from 'axios'

const authStore = useAuthStore()
const { token, user } = storeToRefs(authStore)
const { isLoggedIn, login, logout } = useAuth()
async function apiCall0() {
  const res0 = await axios.get('/api/auth/me')
  return res0.data
}
function nativeAction0() {
  window.NativeApp.requestBiometric()
}
</script>

<template>
  <div class="userprofile">
    <h2>{{ 'UserProfile' }}</h2>


  </div>
</template>
