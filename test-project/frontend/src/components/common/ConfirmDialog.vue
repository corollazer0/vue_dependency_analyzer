<template>
  <div class="common-confirmDialog">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <refresh-button />
    <order-review />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { usePagination } from '@/composables/usePagination'
import axios from 'axios'
import RefreshButton from '@/components/dashboard/RefreshButton.vue'
import OrderReview from '@/components/order/OrderReview.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const userStore = useUserStore()
  const pagination = usePagination()

  const permissionsValue = inject('permissions')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/orders/${id}/cancel`)
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
.common-confirmDialog {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
