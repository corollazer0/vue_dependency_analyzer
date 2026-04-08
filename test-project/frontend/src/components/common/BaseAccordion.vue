<template>
  <div class="common-baseAccordion">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-spinner />
    <auth-error />
    <base-badge />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useValidation } from '@/composables/useValidation'
import { useOrder } from '@/composables/useOrder'
import { client } from '@/api/client'
import axios from 'axios'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import AuthError from '@/components/auth/AuthError.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const settingsStore = useSettingsStore()
  const categoryStore = useCategoryStore()


  const validation = useValidation()
  const order = useOrder()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/login')
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
.common-baseAccordion {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
