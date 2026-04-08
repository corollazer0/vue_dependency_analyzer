<template>
  <div class="user-userGrid">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ip-whitelist />
    <user-avatar />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const analyticsStore = useAnalyticsStore()
  const search = useSearch()
  provide('logger', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/orders')
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
.user-userGrid {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
