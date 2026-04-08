<script setup lang="ts">
import { useCartStore } from '@/stores/cart'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const cartStore = useCartStore()
const { items, couponCode } = storeToRefs(cartStore)
const router = useRouter()
function navigate() { router.push('/product-detail') }
const props = defineProps<{ product: string }>()
function nativeAction0() {
  window.NativeApp.share("Product", location.href)
}
</script>

<template>
  <div class="productcard">
    <h2>{{ 'ProductCard' }}</h2>


  </div>
</template>
