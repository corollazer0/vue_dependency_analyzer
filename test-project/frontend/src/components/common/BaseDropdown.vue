<template>
  <div class="common-baseDropdown">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <two-factor-verify />
    <user-groups />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCouponStore } from '@/stores/couponStore'
import { usePermission } from '@/composables/usePermission'
import { useValidation } from '@/composables/useValidation'
import { eventBus } from '@/services/eventBus'
import axios from 'axios'
import TwoFactorVerify from '@/components/auth/TwoFactorVerify.vue'
import UserGroups from '@/components/user/UserGroups.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const userStore = useUserStore()
  const couponStore = useCouponStore()
  const permission = usePermission()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/products/${id}`)
    const response = await axios.get(`/api/orders/${id}`)
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
.common-baseDropdown {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
