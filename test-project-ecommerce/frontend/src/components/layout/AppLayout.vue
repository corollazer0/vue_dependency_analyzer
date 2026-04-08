<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'
import { provide as vueProvide, inject as vueInject, ref } from 'vue'
import AppSidebar from './../layout/AppSidebar.vue'
import AppHeader from './../layout/AppHeader.vue'

const uiStore = useUiStore()
const { sidebarCollapsed, theme } = storeToRefs(uiStore)
vueProvide('layoutState', ref('value'))
</script>

<template>
  <div class="applayout">
    <h2>{{ 'AppLayout' }}</h2>
      <app-sidebar />
      <app-header />

  </div>
</template>
