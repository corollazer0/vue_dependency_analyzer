<template>
  <div class="common-baseBadge">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-form />
    <user-search />
    <user-settings />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useUserStore } from '@/stores/userStore'
import { usePermission } from '@/composables/usePermission'
import { useNotification } from '@/composables/useNotification'
import { auth } from '@/api/auth'
import axios from 'axios'
import ProductForm from '@/components/product/ProductForm.vue'
import UserSearch from '@/components/user/UserSearch.vue'
import UserSettings from '@/components/user/UserSettings.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'select'])

  const reviewStore = useReviewStore()
  const userStore = useUserStore()


  const permission = usePermission()
  const notification = useNotification()
  provide('theme', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/products/${props.id}`)
    const response1 = await axios.post('/api/auth/logout')
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
.common-baseBadge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
