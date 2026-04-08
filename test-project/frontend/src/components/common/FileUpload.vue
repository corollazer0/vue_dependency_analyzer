<template>
  <div class="common-fileUpload">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-sidebar />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useFilter } from '@/composables/useFilter'
import { useKeyboard } from '@/composables/useKeyboard'
import { products } from '@/api/products'
import axios from 'axios'
import AppSidebar from '@/components/common/AppSidebar.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

  const settingsStore = useSettingsStore()
  const notificationStore = useNotificationStore()


  const filter = useFilter()
  const keyboard = useKeyboard()

  const loggerValue = inject('logger')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/wishlist')
    const response1 = await axios.put(`/api/orders/${props.id}/status`)
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
.common-fileUpload {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
