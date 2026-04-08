<template>
  <div class="order-orderHistory">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-modal />
    <app-navigation />
    <user-search />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEventBus } from '@/composables/useEventBus'
import axios from 'axios'
import UserModal from '@/components/user/UserModal.vue'
import AppNavigation from '@/components/common/AppNavigation.vue'
import UserSearch from '@/components/user/UserSearch.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const settingsStore = useSettingsStore()
  const eventBus = useEventBus()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
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
.order-orderHistory {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
