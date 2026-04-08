<template>
  <div class="dashboard-dashboardLayout">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-grid />
    <ip-whitelist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useSearchStore } from '@/stores/searchStore'
import { useClipboard } from '@/composables/useClipboard'
import { useAuth } from '@/composables/useAuth'
import { client } from '@/api/client'
import axios from 'axios'
import UserGrid from '@/components/user/UserGrid.vue'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'select'])

  const productStore = useProductStore()
  const searchStore = useSearchStore()
  const clipboard = useClipboard()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/categories')
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
.dashboard-dashboardLayout {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
