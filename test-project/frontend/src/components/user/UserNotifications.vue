<template>
  <div class="user-userNotifications">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-analytics />
    <user-timeline />
    <user-table />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useUIStore } from '@/stores/uIStore'
import { useDragDrop } from '@/composables/useDragDrop'
import { useFilter } from '@/composables/useFilter'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductAnalytics from '@/components/product/ProductAnalytics.vue'
import UserTimeline from '@/components/user/UserTimeline.vue'
import UserTable from '@/components/user/UserTable.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const productStore = useProductStore()
  const uIStore = useUIStore()


  const dragDrop = useDragDrop()
  const filter = useFilter()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/cart/items')
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
.user-userNotifications {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
