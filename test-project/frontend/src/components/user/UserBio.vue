<template>
  <div class="user-userBio">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-quick-view />
    <user-list />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useOrderStore } from '@/stores/orderStore'
import { useTheme } from '@/composables/useTheme'
import { useUser } from '@/composables/useUser'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductQuickView from '@/components/product/ProductQuickView.vue'
import UserList from '@/components/user/UserList.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'update'])

  const uIStore = useUIStore()
  const orderStore = useOrderStore()
  const theme = useTheme()
  const user = useUser()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/settings')
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
.user-userBio {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
