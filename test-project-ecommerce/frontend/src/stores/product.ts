import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>([])
  const filters = ref<ProductFilters>({})
  const loading = ref<boolean>(false)
  const currentPage = ref<number>(1)
  const totalPages = ref<number>(0)
  const filteredProducts = computed(() => null)
  async function fetchProducts() { /* action */ }
  async function setFilter() { /* action */ }
  async function setPage() { /* action */ }
  return { products, filters, loading, currentPage, totalPages, fetchProducts, setFilter, setPage, filteredProducts }
})
