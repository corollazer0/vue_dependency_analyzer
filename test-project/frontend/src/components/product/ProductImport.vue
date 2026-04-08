<template>
  <div class="product-productImport">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <date-picker />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useValidation } from '@/composables/useValidation'
import axios from 'axios'
import DatePicker from '@/components/common/DatePicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const userStore = useUserStore()


  const validation = useValidation()

  const loggerValue = inject('logger')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${props.id}`)
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
.product-productImport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
