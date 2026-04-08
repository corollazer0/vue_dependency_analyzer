<template>
  <div class="product-productSort">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <permission-gate />
    <user-bio />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useProductStore } from '@/stores/productStore'
import { useClipboard } from '@/composables/useClipboard'
import { useKeyboard } from '@/composables/useKeyboard'
import { users } from '@/api/users'
import axios from 'axios'
import PermissionGate from '@/components/auth/PermissionGate.vue'
import UserBio from '@/components/user/UserBio.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'close'])

  const uIStore = useUIStore()
  const productStore = useProductStore()


  const clipboard = useClipboard()
  const keyboard = useKeyboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
    const response1 = await axios.get('/api/dashboard/revenue')
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
.product-productSort {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
