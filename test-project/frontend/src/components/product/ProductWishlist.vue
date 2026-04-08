<template>
  <div class="product-productWishlist">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-onboarding />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useDragDrop } from '@/composables/useDragDrop'
import { debounce } from '@/utils/debounce'
import axios from 'axios'
import UserOnboarding from '@/components/user/UserOnboarding.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const uIStore = useUIStore()
  const settingsStore = useSettingsStore()


  const clickOutside = useClickOutside()
  const dragDrop = useDragDrop()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/register')
    const response1 = await axios.get('/api/coupons')
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
.product-productWishlist {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
