<template>
  <div class="common-baseAccordion">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ldap-login />
    <kpi-card />
    <date-range-selector />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useAuthStore } from '@/stores/authStore'
import { useFetch } from '@/composables/useFetch'
import { useCart } from '@/composables/useCart'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import LdapLogin from '@/components/auth/LdapLogin.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const couponStore = useCouponStore()
  const authStore = useAuthStore()
  const fetch = useFetch()
  const cart = useCart()

  const configValue = inject('config')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/cart/items')
    const response = await axios.put('/api/settings')
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
.common-baseAccordion {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
