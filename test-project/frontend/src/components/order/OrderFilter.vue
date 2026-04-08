<template>
  <div class="order-orderFilter">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-button />
    <user-timeline />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useUserStore } from '@/stores/userStore'
import { useValidation } from '@/composables/useValidation'
import { usePagination } from '@/composables/usePagination'
import { eventBus } from '@/services/eventBus'
import axios from 'axios'
import BaseButton from '@/components/common/BaseButton.vue'
import UserTimeline from '@/components/user/UserTimeline.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const cartStore = useCartStore()
  const userStore = useUserStore()
  const validation = useValidation()
  const pagination = usePagination()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.put('/api/settings')
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
.order-orderFilter {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
