<template>
  <div class="order-orderPickup">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <activity-feed />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useEventBus } from '@/composables/useEventBus'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const cartStore = useCartStore()
  const settingsStore = useSettingsStore()
  const geolocation = useGeolocation()
  const eventBus = useEventBus()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/users')
    const response = await axios.put(`/api/users/${id}`)
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
.order-orderPickup {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
