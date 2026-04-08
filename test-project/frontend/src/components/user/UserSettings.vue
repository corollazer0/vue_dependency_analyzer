<template>
  <div class="user-userSettings">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-table />
    <order-tracking />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import axios from 'axios'
import ProductTable from '@/components/product/ProductTable.vue'
import OrderTracking from '@/components/order/OrderTracking.vue'

const props = defineProps({
  size: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const settingsStore = useSettingsStore()
  const settingsStore = useSettingsStore()
  const { items, selectedItem } = storeToRefs(settingsStore)

  const infiniteScroll = useInfiniteScroll()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put('/api/settings')
    data.value = response.data
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
.user-userSettings {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
