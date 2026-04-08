<template>
  <div class="product-productBrand">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-onboarding />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useUserStore } from '@/stores/userStore'
import { useDarkMode } from '@/composables/useDarkMode'
import { usePermission } from '@/composables/usePermission'
import { auth } from '@/api/auth'
import axios from 'axios'
import UserOnboarding from '@/components/user/UserOnboarding.vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const uIStore = useUIStore()
  const userStore = useUserStore()


  const darkMode = useDarkMode()
  const permission = usePermission()

  const permissionsValue = inject('permissions')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/login')
    const response1 = await axios.get(`/api/products/${props.id}/reviews`)
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
.product-productBrand {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
