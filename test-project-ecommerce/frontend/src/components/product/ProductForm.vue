<script setup lang="ts">
import { useForm } from '@/composables/useForm'
import BaseUpload from './../common/BaseUpload.vue'
import axios from 'axios'

const { form } = useForm()
const emit = defineEmits(['submit', 'cancel'])
async function apiCall0() {
  const res0 = await axios.post('/api/products', {})
  return res0.data
}
async function apiCall1() {
  const res1 = await axios.put('/api/products/:id', {})
  return res1.data
}
</script>

<template>
  <div class="productform">
    <h2>{{ 'ProductForm' }}</h2>
      <base-upload @success="() => {}" />

  </div>
</template>
