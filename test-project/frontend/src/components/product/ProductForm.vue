<template>
  <div class="product-productForm">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-item />
    <user-profile />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToast } from '@/composables/useToast'
import axios from 'axios'
import OrderItem from '@/components/order/OrderItem.vue'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const settingsStore = useSettingsStore()
  const toast = useToast()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
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
.product-productForm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
