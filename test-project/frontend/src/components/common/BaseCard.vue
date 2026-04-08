<template>
  <div class="common-baseCard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <date-picker />
    <user-notifications />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import DatePicker from '@/components/common/DatePicker.vue'
import UserNotifications from '@/components/user/UserNotifications.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const notificationStore = useNotificationStore()
  const fetch = useFetch()
  provide('permissions', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
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
.common-baseCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
