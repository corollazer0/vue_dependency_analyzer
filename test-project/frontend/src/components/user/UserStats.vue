<template>
  <div class="user-userStats">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <refresh-button />
    <app-header />
    <user-avatar />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAsync } from '@/composables/useAsync'
import axios from 'axios'
import RefreshButton from '@/components/dashboard/RefreshButton.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const categoryStore = useCategoryStore()
  const async = useAsync()
  provide('locale', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}/reviews`)
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
.user-userStats {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
