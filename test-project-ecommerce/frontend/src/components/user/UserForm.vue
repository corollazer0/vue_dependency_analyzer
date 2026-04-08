<script setup lang="ts">
import { useForm } from '@/composables/useForm'
import axios from 'axios'

const { form } = useForm()
const emit = defineEmits(['submit', 'cancel'])
async function apiCall0() {
  const res0 = await axios.post('/api/users', {})
  return res0.data
}
async function apiCall1() {
  const res1 = await axios.put('/api/users/:id', {})
  return res1.data
}
</script>

<template>
  <div class="userform">
    <h2>{{ 'UserForm' }}</h2>


  </div>
</template>
