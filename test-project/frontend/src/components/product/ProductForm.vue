<template>
  <div class="product-productForm">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <file-upload />
    <product-category />
    </div>
    <button @click="emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { usePagination } from '@/composables/usePagination'
import axios from 'axios'
import FileUpload from '@/components/common/FileUpload.vue'
import ProductCategory from '@/components/product/ProductCategory.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'cancel'])

  const orderStore = useOrderStore()


  const pagination = usePagination()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/logout')
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
.product-productForm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
