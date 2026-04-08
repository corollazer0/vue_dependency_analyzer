<template>
  <div class="dashboard-areaChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-modal />
    <user-sort />
    <user-preferences />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useAsync } from '@/composables/useAsync'
import { useValidation } from '@/composables/useValidation'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import BaseModal from '@/components/common/BaseModal.vue'
import UserSort from '@/components/user/UserSort.vue'
import UserPreferences from '@/components/user/UserPreferences.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const categoryStore = useCategoryStore()
  const analyticsStore = useAnalyticsStore()


  const async = useAsync()
  const validation = useValidation()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/register')
    const response1 = await axios.get('/api/users')
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
.dashboard-areaChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
