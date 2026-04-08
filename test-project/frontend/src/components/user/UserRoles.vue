<template>
  <div class="user-userRoles">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-form />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useUserStore } from '@/stores/userStore'
import { usePermission } from '@/composables/usePermission'
import { useForm } from '@/composables/useForm'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import ProductForm from '@/components/product/ProductForm.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['change', 'submit'])

  const reviewStore = useReviewStore()
  const userStore = useUserStore()
  const permission = usePermission()
  const form = useForm()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${id}`)
    const response = await axios.put(`/api/users/${id}`)
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
.user-userRoles {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
