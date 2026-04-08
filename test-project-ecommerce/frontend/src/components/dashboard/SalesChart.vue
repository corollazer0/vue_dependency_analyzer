<script setup lang="ts">
import axios from 'axios'

async function apiCall0() {
  const res0 = await axios.get('/api/dashboard/sales')
  return res0.data
}
</script>

<template>
  <div class="saleschart">
    <h2>{{ 'SalesChart' }}</h2>


  </div>
</template>
