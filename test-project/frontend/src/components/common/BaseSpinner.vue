<template>
  <div class="common-baseSpinner">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-toast />
    <user-form />
    <user-dropdown />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import BaseToast from '@/components/common/BaseToast.vue'
import UserForm from '@/components/user/UserForm.vue'
import UserDropdown from '@/components/user/UserDropdown.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const reviewStore = useReviewStore()
  const cart = useCart()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/products/${id}/reviews`)
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
.common-baseSpinner {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
