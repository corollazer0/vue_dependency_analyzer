<template>
  <div class="dashboard-funnelChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <file-upload />
    <product-import />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useValidation } from '@/composables/useValidation'
import { useNotification } from '@/composables/useNotification'
import { client } from '@/api/client'
import axios from 'axios'
import FileUpload from '@/components/common/FileUpload.vue'
import ProductImport from '@/components/product/ProductImport.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

  const couponStore = useCouponStore()
  const reviewStore = useReviewStore()


  const validation = useValidation()
  const notification = useNotification()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response1 = await axios.put(`/api/orders/${props.id}/status`)
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}




onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-funnelChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
