import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const messages = ref<Notification[]>([])
  const unreadCount = ref<number>(0)
  const hasUnread = computed(() => null)
  async function fetchNotifications() { /* action */ }
  async function markAsRead() { /* action */ }
  async function markAllRead() { /* action */ }
  return { messages, unreadCount, fetchNotifications, markAsRead, markAllRead, hasUnread }
})
