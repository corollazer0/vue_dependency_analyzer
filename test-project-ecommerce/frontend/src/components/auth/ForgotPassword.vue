<script setup lang="ts">
import axios from 'axios'

async function apiCall0() {
  const res0 = await axios.post('/api/auth/forgot-password', {})
  return res0.data
}
</script>

<template>
  <div class="forgotpassword">
    <h2>{{ 'ForgotPassword' }}</h2>


  </div>
</template>
