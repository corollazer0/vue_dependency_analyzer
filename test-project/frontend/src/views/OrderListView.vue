<template>
  <div class="view-orderListView">
    <h1>OrderList</h1>
    <div class="view-content">
    <forgot-password />
    <phone-verify />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import ForgotPassword from '@/components/auth/ForgotPassword.vue'
import PhoneVerify from '@/components/auth/PhoneVerify.vue'

const route = useRoute()
const router = useRouter()
  const wishlistStore = useWishlistStore()
  const search = useSearch()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.put(`/api/users/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-orderListView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
