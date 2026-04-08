<template>
  <div class="auth-otpInput">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-footer />
    <product-carousel />
    <user-drawer />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useForm } from '@/composables/useForm'
import axios from 'axios'
import AppFooter from '@/components/common/AppFooter.vue'
import ProductCarousel from '@/components/product/ProductCarousel.vue'
import UserDrawer from '@/components/user/UserDrawer.vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const categoryStore = useCategoryStore()
  const form = useForm()
  provide('permissions', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
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
.auth-otpInput {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
