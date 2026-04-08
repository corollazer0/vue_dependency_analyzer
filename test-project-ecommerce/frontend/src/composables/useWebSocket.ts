import { ref } from 'vue'
import { useNotificationStore } from '@/stores/notification'

export function useWebSocket() {
  const connected = ref(false)
  const notifStore = useNotificationStore()
  function connect(url: string) { connected.value = true }
  function disconnect() { connected.value = false }
  return { connected, connect, disconnect }
}
