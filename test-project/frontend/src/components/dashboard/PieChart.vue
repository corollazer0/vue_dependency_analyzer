<template>
  <div class="dashboard-pieChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <register-form />
    <auth-guard />
    <two-factor-setup />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import AuthGuard from '@/components/auth/AuthGuard.vue'
import TwoFactorSetup from '@/components/auth/TwoFactorSetup.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const wishlistStore = useWishlistStore()


  const search = useSearch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
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
.dashboard-pieChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
