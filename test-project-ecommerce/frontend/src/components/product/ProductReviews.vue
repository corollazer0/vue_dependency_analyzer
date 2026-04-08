<script setup lang="ts">
import axios from 'axios'

const emit = defineEmits(['review-submitted'])
async function apiCall0() {
  const res0 = await axios.get('/api/products/:id/reviews')
  return res0.data
}
async function apiCall1() {
  const res1 = await axios.post('/api/products/:id/reviews', {})
  return res1.data
}
</script>

<template>
  <div class="productreviews">
    <h2>{{ 'ProductReviews' }}</h2>


  </div>
</template>
