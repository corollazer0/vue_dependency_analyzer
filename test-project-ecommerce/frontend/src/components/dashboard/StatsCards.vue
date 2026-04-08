<script setup lang="ts">
import axios from 'axios'

async function apiCall0() {
  const res0 = await axios.get('/api/dashboard/stats')
  return res0.data
}
</script>

<template>
  <div class="statscards">
    <h2>{{ 'StatsCards' }}</h2>


  </div>
</template>
