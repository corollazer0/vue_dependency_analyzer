<template>
  <div class="product-productDetail">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-form @submit="handleSubmit" @cancel="handleCancel" />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useMediaQuery } from '@/composables/useMediaQuery'
import axios from 'axios'
import ProductForm from '@/components/product/ProductForm.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const uIStore = useUIStore()


  const mediaQuery = useMediaQuery()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

  function handleSubmit() {
    console.log('submit event received')
  }

  function handleCancel() {
    console.log('cancel event received')
  }


onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.product-productDetail {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
