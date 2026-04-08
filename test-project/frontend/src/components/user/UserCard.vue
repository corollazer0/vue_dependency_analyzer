<template>
  <div class="user-userCard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-tooltip />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useProduct } from '@/composables/useProduct'
import { useToast } from '@/composables/useToast'
import { storage } from '@/services/storage'
import axios from 'axios'
import UserTooltip from '@/components/user/UserTooltip.vue'

const props = defineProps({
  items: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const searchStore = useSearchStore()
  const analyticsStore = useAnalyticsStore()
  const product = useProduct()
  const toast = useToast()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response = await axios.put(`/api/inventory/${id}`)
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
.user-userCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
