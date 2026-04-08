<template>
  <div class="product-productExport">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <register-form />
    <data-grid />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { useToast } from '@/composables/useToast'
import { useDragDrop } from '@/composables/useDragDrop'
import { client } from '@/api/client'
import axios from 'axios'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import DataGrid from '@/components/dashboard/DataGrid.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const settingsStore = useSettingsStore()
  const userStore = useUserStore()
  const toast = useToast()
  const dragDrop = useDragDrop()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    const response = await axios.post('/api/orders')
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
.product-productExport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
