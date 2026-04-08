<script setup lang="ts">


const props = defineProps<{ variants: string }>()
const emit = defineEmits(['variant-change'])
</script>

<template>
  <div class="productvariants">
    <h2>{{ 'ProductVariants' }}</h2>


  </div>
</template>
