<script setup lang="ts">
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
function navigate() { router.push('/login') }
async function apiCall0() {
  const res0 = await axios.post('/api/auth/reset-password', {})
  return res0.data
}
</script>

<template>
  <div class="resetpassword">
    <h2>{{ 'ResetPassword' }}</h2>


  </div>
</template>
