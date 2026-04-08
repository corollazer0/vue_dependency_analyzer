<script setup lang="ts">
import { usePagination } from '@/composables/usePagination'
import BaseTable from './../common/BaseTable.vue'
import SearchInput from './../common/SearchInput.vue'
import axios from 'axios'

const { pagination } = usePagination()
async function apiCall0() {
  const res0 = await axios.get('/api/users')
  return res0.data
}
</script>

<template>
  <div class="userlist">
    <h2>{{ 'UserList' }}</h2>
      <base-table @row-click="() => {}" />
      <search-input @search="() => {}" />
    <div v-permission="'admin'">Admin only</div>
  </div>
</template>
