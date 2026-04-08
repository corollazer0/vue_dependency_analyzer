import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order|null>(null)
  const statusFilter = ref<string>("")
  const pendingOrders = computed(() => null)
  const completedOrders = computed(() => null)
  async function fetchOrders() { /* action */ }
  async function fetchOrder() { /* action */ }
  async function updateStatus() { /* action */ }
  async function cancelOrder() { /* action */ }
  return { orders, currentOrder, statusFilter, fetchOrders, fetchOrder, updateStatus, cancelOrder, pendingOrders, completedOrders }
})
