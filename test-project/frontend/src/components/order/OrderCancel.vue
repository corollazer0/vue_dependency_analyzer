<template>
  <div class="order-orderCancel">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <identity-verify />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useUserStore } from '@/stores/userStore'
import { useForm } from '@/composables/useForm'
import { useClickOutside } from '@/composables/useClickOutside'
import { storage } from '@/services/storage'
import axios from 'axios'
import IdentityVerify from '@/components/auth/IdentityVerify.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const wishlistStore = useWishlistStore()
  const userStore = useUserStore()


  const form = useForm()
  const clickOutside = useClickOutside()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/orders')
    const response1 = await axios.get('/api/categories')
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
.order-orderCancel {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
