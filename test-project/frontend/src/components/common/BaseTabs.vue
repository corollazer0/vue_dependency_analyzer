<template>
  <div class="common-baseTabs">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-quick-view />
    <date-picker />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import ProductQuickView from '@/components/product/ProductQuickView.vue'
import DatePicker from '@/components/common/DatePicker.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()
  const search = useSearch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
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
.common-baseTabs {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
