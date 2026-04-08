<template>
  <div class="auth-ssoLogin">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-category />
    <product-review />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useClipboard } from '@/composables/useClipboard'
import { useKeyboard } from '@/composables/useKeyboard'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import ProductCategory from '@/components/product/ProductCategory.vue'
import ProductReview from '@/components/product/ProductReview.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['change', 'delete'])

  const searchStore = useSearchStore()
  const wishlistStore = useWishlistStore()


  const clipboard = useClipboard()
  const keyboard = useKeyboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/users/${props.id}`)
    const response1 = await axios.get('/api/reviews')
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
.auth-ssoLogin {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
