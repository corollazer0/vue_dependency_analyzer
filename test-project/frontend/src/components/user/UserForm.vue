<template>
  <div class="user-userForm">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-notes />
    </div>
    <button @click="emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useOrder } from '@/composables/useOrder'
import axios from 'axios'
import OrderNotes from '@/components/order/OrderNotes.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'cancel'])

  const authStore = useAuthStore()


  const order = useOrder()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/wishlist')
    data.value = response.data
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
.user-userForm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
