<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import StatsCards from './StatsCards.vue'
import SalesChart from './SalesChart.vue'
import OrdersWidget from './OrdersWidget.vue'
import TopProducts from './TopProducts.vue'

const notificationStore = useNotificationStore()
const { messages, unreadCount } = storeToRefs(notificationStore)
</script>

<template>
  <div class="dashboardpage">
    <h2>{{ 'DashboardPage' }}</h2>
      <stats-cards />
      <sales-chart />
      <orders-widget />
      <top-products />

  </div>
</template>
