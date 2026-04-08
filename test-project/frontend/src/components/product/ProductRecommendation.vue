<template>
  <div class="product-productRecommendation">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-tooltip />
    <base-select />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useValidation } from '@/composables/useValidation'
import axios from 'axios'
import BaseTooltip from '@/components/common/BaseTooltip.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
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
.product-productRecommendation {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
