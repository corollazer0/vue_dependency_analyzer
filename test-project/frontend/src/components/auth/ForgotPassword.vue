<template>
  <div class="auth-forgotPassword">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-modal />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const orderStore = useOrderStore()
  const localStorage = useLocalStorage()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
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
.auth-forgotPassword {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
