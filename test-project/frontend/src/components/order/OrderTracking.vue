<template>
  <div class="order-orderTracking">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <role-guard />
    <user-table />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFilter } from '@/composables/useFilter'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { validators } from '@/utils/validators'
import axios from 'axios'
import RoleGuard from '@/components/auth/RoleGuard.vue'
import UserTable from '@/components/user/UserTable.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const searchStore = useSearchStore()
  const settingsStore = useSettingsStore()
  const filter = useFilter()
  const localStorage = useLocalStorage()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/orders')
    const response = await axios.get('/api/settings')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.order-orderTracking {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
