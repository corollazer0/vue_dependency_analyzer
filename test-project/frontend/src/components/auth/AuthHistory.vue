<template>
  <div class="auth-authHistory">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-error />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import AuthError from '@/components/auth/AuthError.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const uIStore = useUIStore()
  const fetch = useFetch()
  provide('permissions', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.auth-authHistory {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
