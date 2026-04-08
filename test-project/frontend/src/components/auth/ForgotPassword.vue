<template>
  <div class="auth-forgotPassword">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-detail />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import OrderDetail from '@/components/order/OrderDetail.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const productStore = useProductStore()


  const keyboard = useKeyboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
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
.auth-forgotPassword {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
