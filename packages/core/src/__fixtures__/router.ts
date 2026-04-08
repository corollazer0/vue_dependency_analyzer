import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import UserListView from '@/views/UserListView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomeView },
  { path: '/users', component: UserListView },
  { path: '/users/:id', component: () => import('@/views/UserDetailView.vue') },
  { path: '/products', component: () => import('@/views/ProductListView.vue') },
]

export default createRouter({ history: createWebHistory(), routes })
