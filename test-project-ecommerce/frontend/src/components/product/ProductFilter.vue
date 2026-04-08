<script setup lang="ts">
import axios from 'axios'

const emit = defineEmits(['filter-change'])
async function apiCall0() {
  const res0 = await axios.get('/api/categories/tree')
  return res0.data
}
</script>

<template>
  <div class="productfilter">
    <h2>{{ 'ProductFilter' }}</h2>


  </div>
</template>
