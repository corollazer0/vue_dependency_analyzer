<script setup lang="ts">


const props = defineProps<{ columns: string; data: string }>()
const emit = defineEmits(['sort-change', 'page-change', 'row-click'])
</script>

<template>
  <div class="basetable">
    <h2>{{ 'BaseTable' }}</h2>


  </div>
</template>
