<script setup lang="ts">
import axios from 'axios'

async function apiCall0() {
  const res0 = await axios.get('/api/categories')
  return res0.data
}
async function apiCall1() {
  const res1 = await axios.post('/api/categories', {})
  return res1.data
}
async function apiCall2() {
  const res2 = await axios.put('/api/categories/:id', {})
  return res2.data
}
</script>

<template>
  <div class="categorymanager">
    <h2>{{ 'CategoryManager' }}</h2>

    <div v-permission="'admin'">Admin only</div>
  </div>
</template>
