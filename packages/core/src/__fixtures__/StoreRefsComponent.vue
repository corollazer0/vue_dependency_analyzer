<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'

const userStore = useUserStore()
const { userName, isLoggedIn, role } = storeToRefs(userStore)

const cartStore = useCartStore()
const { items, totalPrice } = storeToRefs(cartStore)
</script>
<template><div>{{ userName }}</div></template>
