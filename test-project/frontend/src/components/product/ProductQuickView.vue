<template>
  <div class="product-productQuickView">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-alert />
    <user-onboarding />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFilter } from '@/composables/useFilter'
import axios from 'axios'
import BaseAlert from '@/components/common/BaseAlert.vue'
import UserOnboarding from '@/components/user/UserOnboarding.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const settingsStore = useSettingsStore()


  const filter = useFilter()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/users/${props.id}`)
    data.value = response.data
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
.product-productQuickView {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
