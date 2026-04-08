<template>
  <div class="auth-ssoLogin">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-pagination />
    <user-export />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { useDebounce } from '@/composables/useDebounce'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import BasePagination from '@/components/common/BasePagination.vue'
import UserExport from '@/components/user/UserExport.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const categoryStore = useCategoryStore()
  const wishlistStore = useWishlistStore()
  const keyboard = useKeyboard()
  const debounce = useDebounce()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/cart')
    const response = await axios.get('/api/users')
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
.auth-ssoLogin {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
