import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const couponCode = ref<string>("")
  const totalPrice = computed(() => null)
  const itemCount = computed(() => null)
  async function addItem() { /* action */ }
  async function removeItem() { /* action */ }
  async function updateQuantity() { /* action */ }
  async function applyCoupon() { /* action */ }
  async function clearCart() { /* action */ }
  return { items, couponCode, addItem, removeItem, updateQuantity, applyCoupon, clearCart, totalPrice, itemCount }
})
