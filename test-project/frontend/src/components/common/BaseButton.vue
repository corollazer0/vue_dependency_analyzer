<template>
  <div class="common-baseButton">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <email-verify />
    <base-spinner />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import EmailVerify from '@/components/auth/EmailVerify.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const uIStore = useUIStore()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/auth/refresh')
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
.common-baseButton {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
