<template>
  <div class="view-productListView">
    <h1>ProductList</h1>
    <div class="view-content">
    <user-deletion />
    <user-form />
    <user-table />
    <user-tooltip />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from 'axios'
import UserDeletion from '@/components/user/UserDeletion.vue'
import UserForm from '@/components/user/UserForm.vue'
import UserTable from '@/components/user/UserTable.vue'
import UserTooltip from '@/components/user/UserTooltip.vue'

const route = useRoute()
const router = useRouter()
  const cartStore = useCartStore()
  const webSocket = useWebSocket()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.get('/api/coupons')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-productListView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
