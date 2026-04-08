<template>
  <div class="user-userProfile">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-form @submit="handleSubmit" @cancel="handleCancel" />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/uIStore'
import { useUserStore } from '@/stores/userStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import axios from 'axios'
import UserForm from '@/components/user/UserForm.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const uIStore = useUIStore()
  const userStore = useUserStore()
  const { userName, isLoggedIn } = storeToRefs(userStore)

  const breakpoint = useBreakpoint()
  provide('permissions', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

  function handleSubmit() {
    console.log('submit event received')
  }

  function handleCancel() {
    console.log('cancel event received')
  }


onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.user-userProfile {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
