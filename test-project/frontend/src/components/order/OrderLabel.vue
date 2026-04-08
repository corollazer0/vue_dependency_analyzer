<template>
  <div class="order-orderLabel">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-alert />
    <token-refresh />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useAuth } from '@/composables/useAuth'
import { useDragDrop } from '@/composables/useDragDrop'
import { logger } from '@/services/logger'
import axios from 'axios'
import BaseAlert from '@/components/common/BaseAlert.vue'
import TokenRefresh from '@/components/auth/TokenRefresh.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const couponStore = useCouponStore()
  const reviewStore = useReviewStore()


  const auth = useAuth()
  const dragDrop = useDragDrop()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/categories')
    const response1 = await axios.put(`/api/users/${props.id}`)
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
.order-orderLabel {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
