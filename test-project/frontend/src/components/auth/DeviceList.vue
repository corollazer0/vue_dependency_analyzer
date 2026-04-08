<template>
  <div class="auth-deviceList">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-variant />
    <product-brand />
    <user-modal />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAuthStore } from '@/stores/authStore'
import { useFilter } from '@/composables/useFilter'
import { usePermission } from '@/composables/usePermission'
import { constants } from '@/utils/constants'
import axios from 'axios'
import ProductVariant from '@/components/product/ProductVariant.vue'
import ProductBrand from '@/components/product/ProductBrand.vue'
import UserModal from '@/components/user/UserModal.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const categoryStore = useCategoryStore()
  const authStore = useAuthStore()


  const filter = useFilter()
  const permission = usePermission()
  provide('permissions', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/reviews')
    const response1 = await axios.get('/api/users')
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
.auth-deviceList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
