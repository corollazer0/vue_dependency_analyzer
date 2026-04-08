<template>
  <div class="product-productCard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-contacts />
    <user-tooltip />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useUser } from '@/composables/useUser'
import axios from 'axios'
import UserContacts from '@/components/user/UserContacts.vue'
import UserTooltip from '@/components/user/UserTooltip.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const cartStore = useCartStore()
  const user = useUser()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.product-productCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
