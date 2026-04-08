<template>
  <div class="user-userDropdown">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useForm } from '@/composables/useForm'
import { useDebounce } from '@/composables/useDebounce'
import { constants } from '@/utils/constants'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'update'])

  const categoryStore = useCategoryStore()
  const analyticsStore = useAnalyticsStore()


  const form = useForm()
  const debounce = useDebounce()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post(`/api/products/${props.id}/reviews`)
    const response1 = await axios.post('/api/upload')
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
.user-userDropdown {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
