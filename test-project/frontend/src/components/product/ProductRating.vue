<template>
  <div class="product-productRating">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-toast />
    <user-permissions />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { usePagination } from '@/composables/usePagination'
import axios from 'axios'
import BaseToast from '@/components/common/BaseToast.vue'
import UserPermissions from '@/components/user/UserPermissions.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const notificationStore = useNotificationStore()
  const pagination = usePagination()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/orders')
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
.product-productRating {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
