<template>
  <div class="user-userPermissions">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-gallery />
    <user-table />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePagination } from '@/composables/usePagination'
import axios from 'axios'
import ProductGallery from '@/components/product/ProductGallery.vue'
import UserTable from '@/components/user/UserTable.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const settingsStore = useSettingsStore()
  const pagination = usePagination()

  const loggerValue = inject('logger')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/notifications')
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
.user-userPermissions {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
