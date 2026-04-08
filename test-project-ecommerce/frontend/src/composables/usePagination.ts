import { ref, computed } from 'vue'

export function usePagination(initialPageSize = 20) {
  const page = ref(1)
  const pageSize = ref(initialPageSize)
  const total = ref(0)
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  function setPage(p: number) { page.value = p }
  return { page, pageSize, total, totalPages, setPage }
}
