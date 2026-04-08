<template>
  <div class="user-userMerge">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-search />
    <user-form />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useSearchStore } from '@/stores/searchStore'
import { useAsync } from '@/composables/useAsync'
import { useNotification } from '@/composables/useNotification'
import { auth } from '@/api/auth'
import axios from 'axios'
import UserSearch from '@/components/user/UserSearch.vue'
import UserForm from '@/components/user/UserForm.vue'

const props = defineProps({
  items: { type: String, default: '' },
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const uIStore = useUIStore()
  const searchStore = useSearchStore()
  const async = useAsync()
  const notification = useNotification()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
    const response = await axios.get('/api/products')
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
.user-userMerge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
