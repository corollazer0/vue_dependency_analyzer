<template>
  <div class="order-orderTable">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-navigation />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useAuthStore } from '@/stores/authStore'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { usePermission } from '@/composables/usePermission'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import AppNavigation from '@/components/common/AppNavigation.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change', 'delete'])

  const orderStore = useOrderStore()
  const authStore = useAuthStore()


  const mediaQuery = useMediaQuery()
  const permission = usePermission()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
    const response1 = await axios.post('/api/products')
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
.order-orderTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
