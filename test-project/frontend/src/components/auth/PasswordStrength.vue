<template>
  <div class="auth-passwordStrength">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-badge />
    <user-bio />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useClipboard } from '@/composables/useClipboard'
import axios from 'axios'
import UserBadge from '@/components/user/UserBadge.vue'
import UserBio from '@/components/user/UserBio.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const settingsStore = useSettingsStore()


  const clipboard = useClipboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/products')
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
.auth-passwordStrength {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
