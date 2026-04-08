<template>
  <div class="order-orderRefund">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-pagination />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useDragDrop } from '@/composables/useDragDrop'
import { useTheme } from '@/composables/useTheme'
import { users } from '@/api/users'
import axios from 'axios'
import BasePagination from '@/components/common/BasePagination.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const notificationStore = useNotificationStore()
  const wishlistStore = useWishlistStore()
  const dragDrop = useDragDrop()
  const theme = useTheme()

  const configValue = inject('config')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/notifications/${id}/read`)
    const response = await axios.post('/api/auth/register')
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
.order-orderRefund {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
