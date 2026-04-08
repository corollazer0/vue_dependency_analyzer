<template>
  <div class="common-loadingOverlay">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-badge />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUser } from '@/composables/useUser'
import { useFetch } from '@/composables/useFetch'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import ProductBadge from '@/components/product/ProductBadge.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'delete'])

  const inventoryStore = useInventoryStore()
  const notificationStore = useNotificationStore()
  const user = useUser()
  const fetch = useFetch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/reviews')
    const response = await axios.get('/api/notifications')
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
.common-loadingOverlay {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
