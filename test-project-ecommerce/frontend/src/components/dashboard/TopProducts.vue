<script setup lang="ts">
import axios from 'axios'

async function apiCall0() {
  const res0 = await axios.get('/api/dashboard/top-products')
  return res0.data
}
</script>

<template>
  <div class="topproducts">
    <h2>{{ 'TopProducts' }}</h2>


  </div>
</template>
