<template>
  <div class="common-loadingOverlay">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <data-grid />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAsync } from '@/composables/useAsync'
import { useAuth } from '@/composables/useAuth'
import { users } from '@/api/users'
import axios from 'axios'
import DataGrid from '@/components/dashboard/DataGrid.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const settingsStore = useSettingsStore()
  const inventoryStore = useInventoryStore()


  const async = useAsync()
  const auth = useAuth()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/products')
    const response1 = await axios.delete(`/api/cart/items/${props.id}`)
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
.common-loadingOverlay {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
