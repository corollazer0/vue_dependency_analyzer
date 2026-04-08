<template>
  <div class="user-userTooltip">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-notifications />
    <product-analytics />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useUserStore } from '@/stores/userStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useTheme } from '@/composables/useTheme'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import UserNotifications from '@/components/user/UserNotifications.vue'
import ProductAnalytics from '@/components/product/ProductAnalytics.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])

  const searchStore = useSearchStore()
  const userStore = useUserStore()
  const clickOutside = useClickOutside()
  const theme = useTheme()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/products/${id}/reviews`)
    const response = await axios.delete(`/api/users/${id}`)
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
.user-userTooltip {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
