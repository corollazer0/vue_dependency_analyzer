<template>
  <div class="order-orderPrint">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-error />
    <ip-whitelist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useUIStore } from '@/stores/uIStore'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { auth } from '@/api/auth'
import axios from 'axios'
import AuthError from '@/components/auth/AuthError.vue'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'

const props = defineProps({
  size: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'delete'])

  const categoryStore = useCategoryStore()
  const uIStore = useUIStore()
  const auth = useAuth()
  const toast = useToast()
  provide('permissions', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/inventory')
    const response = await axios.put(`/api/orders/${id}/status`)
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
.order-orderPrint {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
