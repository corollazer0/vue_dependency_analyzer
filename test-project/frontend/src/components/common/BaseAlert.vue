<template>
  <div class="common-baseAlert">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <file-upload />
    <base-card />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSearch } from '@/composables/useSearch'
import { useAuth } from '@/composables/useAuth'
import { logger } from '@/services/logger'
import axios from 'axios'
import FileUpload from '@/components/common/FileUpload.vue'
import BaseCard from '@/components/common/BaseCard.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const orderStore = useOrderStore()
  const notificationStore = useNotificationStore()


  const search = useSearch()
  const auth = useAuth()

  const themeValue = inject('theme')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/wishlist')
    const response1 = await axios.get('/api/settings')
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
.common-baseAlert {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
