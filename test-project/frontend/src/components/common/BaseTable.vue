<template>
  <div class="common-baseTable">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-stats />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useUIStore } from '@/stores/uIStore'
import { useWebSocket } from '@/composables/useWebSocket'
import { usePermission } from '@/composables/usePermission'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import UserStats from '@/components/user/UserStats.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const cartStore = useCartStore()
  const uIStore = useUIStore()
  const webSocket = useWebSocket()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/products/${id}`)
    const response = await axios.get(`/api/products/${id}`)
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
.common-baseTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
