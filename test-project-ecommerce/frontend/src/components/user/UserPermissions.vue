<script setup lang="ts">
import axios from 'axios'

async function apiCall0() {
  const res0 = await axios.get('/api/users/:id')
  return res0.data
}
</script>

<template>
  <div class="userpermissions">
    <h2>{{ 'UserPermissions' }}</h2>

    <div v-permission="'admin'">Admin only</div>
  </div>
</template>
