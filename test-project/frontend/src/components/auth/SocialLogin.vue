<template>
  <div class="auth-socialLogin">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <icon-wrapper />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useClipboard } from '@/composables/useClipboard'
import { useCart } from '@/composables/useCart'
import { validators } from '@/utils/validators'
import axios from 'axios'
import IconWrapper from '@/components/common/IconWrapper.vue'

const props = defineProps({
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const reviewStore = useReviewStore()
  const analyticsStore = useAnalyticsStore()


  const clipboard = useClipboard()
  const cart = useCart()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response1 = await axios.post('/api/users')
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
.auth-socialLogin {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
