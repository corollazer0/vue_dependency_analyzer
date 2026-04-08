<template>
  <div class="product-productDetail">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-preferences />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useGeolocation } from '@/composables/useGeolocation'
import axios from 'axios'
import UserPreferences from '@/components/user/UserPreferences.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const productStore = useProductStore()
  const geolocation = useGeolocation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.product-productDetail {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
