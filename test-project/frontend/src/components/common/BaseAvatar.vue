<template>
  <div class="common-baseAvatar">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-timeline />
    <user-preferences />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useDarkMode } from '@/composables/useDarkMode'
import axios from 'axios'
import UserTimeline from '@/components/user/UserTimeline.vue'
import UserPreferences from '@/components/user/UserPreferences.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const uIStore = useUIStore()
  const darkMode = useDarkMode()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.common-baseAvatar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
