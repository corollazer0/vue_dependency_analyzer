<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
function navigate() { router.push('/product-detail') }
const props = defineProps<{ items: string }>()
</script>

<template>
  <div class="orderitems">
    <h2>{{ 'OrderItems' }}</h2>


  </div>
</template>
