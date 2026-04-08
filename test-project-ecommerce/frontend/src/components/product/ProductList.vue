<script setup lang="ts">
import { useProductStore } from '@/stores/product'
import { usePagination } from '@/composables/usePagination'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import BaseTable from './../common/BaseTable.vue'
import ProductFilter from './ProductFilter.vue'
import axios from 'axios'

const productStore = useProductStore()
const { products, filters } = storeToRefs(productStore)
const { pagination } = usePagination()
const router = useRouter()
function navigate() { router.push('/product-detail') }
async function apiCall0() {
  const res0 = await axios.get('/api/products')
  return res0.data
}
</script>

<template>
  <div class="productlist">
    <h2>{{ 'ProductList' }}</h2>
      <base-table @sort-change="() => {}" @page-change="() => {}" />
      <product-filter @filter-change="() => {}" />
    <div v-permission="'admin'">Admin only</div>
  </div>
</template>
