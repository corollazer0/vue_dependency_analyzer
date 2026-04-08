<template>
  <div class="common-baseTable">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-dropdown />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useValidation } from '@/composables/useValidation'
import { useAsync } from '@/composables/useAsync'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import BaseDropdown from '@/components/common/BaseDropdown.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const reviewStore = useReviewStore()
  const notificationStore = useNotificationStore()


  const validation = useValidation()
  const async = useAsync()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/products')
    const response1 = await axios.post('/api/auth/refresh')
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
.common-baseTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
