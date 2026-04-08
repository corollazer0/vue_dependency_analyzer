<template>
  <div class="common-baseAlert">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-delivery />
    <user-contacts />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useSearchStore } from '@/stores/searchStore'
import { useDarkMode } from '@/composables/useDarkMode'
import { useThrottle } from '@/composables/useThrottle'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import OrderDelivery from '@/components/order/OrderDelivery.vue'
import UserContacts from '@/components/user/UserContacts.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const orderStore = useOrderStore()
  const searchStore = useSearchStore()
  const darkMode = useDarkMode()
  const throttle = useThrottle()

  const permissionsValue = inject('permissions')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/categories')
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
.common-baseAlert {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
