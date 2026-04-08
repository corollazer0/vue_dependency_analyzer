<template>
  <div class="view-homeView">
    <h1>Home</h1>
    <div class="view-content">
    <base-tooltip />
    <search-bar />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import BaseTooltip from '@/components/common/BaseTooltip.vue'
import SearchBar from '@/components/common/SearchBar.vue'

const route = useRoute()
const router = useRouter()
  const wishlistStore = useWishlistStore()
  const cart = useCart()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.delete(`/api/wishlist/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-homeView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
