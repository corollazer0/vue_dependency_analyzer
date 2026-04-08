<template>
  <div class="product-productReview">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-history />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useOrderStore } from '@/stores/orderStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { useSearch } from '@/composables/useSearch'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import AuthHistory from '@/components/auth/AuthHistory.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select', 'change'])

  const analyticsStore = useAnalyticsStore()
  const orderStore = useOrderStore()


  const keyboard = useKeyboard()
  const search = useSearch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/notifications')
    const response1 = await axios.put(`/api/notifications/${props.id}/read`)
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}




onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.product-productReview {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
