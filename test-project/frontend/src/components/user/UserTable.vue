<template>
  <div class="user-userTable">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-label />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCouponStore } from '@/stores/couponStore'
import { useDarkMode } from '@/composables/useDarkMode'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import OrderLabel from '@/components/order/OrderLabel.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const productStore = useProductStore()
  const couponStore = useCouponStore()


  const darkMode = useDarkMode()
  const infiniteScroll = useInfiniteScroll()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/refresh')
    const response1 = await axios.get('/api/search')
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
.user-userTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
