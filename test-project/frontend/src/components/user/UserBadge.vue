<template>
  <div class="user-userBadge">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-chip />
    <base-dropdown />
    <app-footer />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSearchStore } from '@/stores/searchStore'
import { useSearch } from '@/composables/useSearch'
import { useValidation } from '@/composables/useValidation'
import { validators } from '@/utils/validators'
import axios from 'axios'
import BaseChip from '@/components/common/BaseChip.vue'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import AppFooter from '@/components/common/AppFooter.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'select'])

  const userStore = useUserStore()
  const searchStore = useSearchStore()


  const search = useSearch()
  const validation = useValidation()

  const themeValue = inject('theme')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/refresh')
    const response1 = await axios.post('/api/users')
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
.user-userBadge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
