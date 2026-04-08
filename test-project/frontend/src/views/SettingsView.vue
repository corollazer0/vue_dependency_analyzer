<template>
  <div class="view-settingsView">
    <h1>Settings</h1>
    <div class="view-content">
    <search-bar />
    <base-pagination />
    <sort-select />
    <base-card />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'
import SearchBar from '@/components/common/SearchBar.vue'
import BasePagination from '@/components/common/BasePagination.vue'
import SortSelect from '@/components/common/SortSelect.vue'
import BaseCard from '@/components/common/BaseCard.vue'

const route = useRoute()
const router = useRouter()
  const cartStore = useCartStore()
  const clickOutside = useClickOutside()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get('/api/reviews')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-settingsView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
