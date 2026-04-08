<template>
  <div class="common-basePopover">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-permissions />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useProduct } from '@/composables/useProduct'
import { useClickOutside } from '@/composables/useClickOutside'
import { formatCurrency } from '@/utils/formatCurrency'
import axios from 'axios'
import UserPermissions from '@/components/user/UserPermissions.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const userStore = useUserStore()
  const inventoryStore = useInventoryStore()


  const product = useProduct()
  const clickOutside = useClickOutside()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
    const response1 = await axios.put(`/api/products/${props.id}`)
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
.common-basePopover {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
