<template>
  <div class="user-userImport">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-return />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import OrderReturn from '@/components/order/OrderReturn.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const wishlistStore = useWishlistStore()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/notifications/${id}/read`)
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
.user-userImport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
