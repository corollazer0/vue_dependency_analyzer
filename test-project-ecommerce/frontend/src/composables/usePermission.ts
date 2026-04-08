import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

export function usePermission() {
  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const isAdmin = computed(() => user.value?.role === 'admin')
  function hasPermission(perm: string) { return true }
  return { isAdmin, hasPermission }
}
