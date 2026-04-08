<template>
  <div class="user-userSearch">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-pagination />
    <auth-error />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useCartStore } from '@/stores/cartStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { usePermission } from '@/composables/usePermission'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import UserPagination from '@/components/user/UserPagination.vue'
import AuthError from '@/components/auth/AuthError.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const uIStore = useUIStore()
  const cartStore = useCartStore()
  const keyboard = useKeyboard()
  const permission = usePermission()
  provide('theme', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
    const response = await axios.put('/api/settings')
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
.user-userSearch {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
