import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(null)
  const userName = ref('')

  function setToken(t: string) {
    token.value = t
  }

  function clearToken() {
    token.value = null
  }

  return { token, userName, setToken, clearToken }
})
