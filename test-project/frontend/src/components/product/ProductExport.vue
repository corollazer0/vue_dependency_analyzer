<template>
  <div class="product-productExport">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <logout-confirm />
    <app-header />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOrderStore } from '@/stores/orderStore'
import { useForm } from '@/composables/useForm'
import { useClickOutside } from '@/composables/useClickOutside'
import { client } from '@/api/client'
import axios from 'axios'
import LogoutConfirm from '@/components/auth/LogoutConfirm.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const settingsStore = useSettingsStore()
  const orderStore = useOrderStore()


  const form = useForm()
  const clickOutside = useClickOutside()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/refresh')
    const response1 = await axios.delete(`/api/users/${props.id}`)
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
.product-productExport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
