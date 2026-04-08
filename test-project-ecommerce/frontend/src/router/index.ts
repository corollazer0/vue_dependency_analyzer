import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const HomeView = () => import('@/components/dashboard/DashboardPage.vue')
const LoginView = () => import('@/components/auth/Login.vue')
const RegisterView = () => import('@/components/auth/Register.vue')
const ForgotPasswordView = () => import('@/components/auth/ForgotPassword.vue')
const DashboardView = () => import('@/components/dashboard/DashboardPage.vue')
const ProductListView = () => import('@/components/product/ProductList.vue')
const ProductDetailView = () => import('@/components/product/ProductDetail.vue')
const ProductCreateView = () => import('@/components/product/ProductCreate.vue')
const OrderListView = () => import('@/components/order/OrderList.vue')
const OrderDetailView = () => import('@/components/order/OrderDetail.vue')
const UserListView = () => import('@/components/user/UserList.vue')
const UserProfileView = () => import('@/components/user/UserProfile.vue')
const CategoryManagerView = () => import('@/components/product/CategoryManager.vue')
const SettingsView = () => import('@/components/auth/Settings.vue')
const NotFoundView = () => import('@/components/auth/NotFound.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { requiresAuth: false } },
  { path: '/register', name: 'register', component: RegisterView, meta: { requiresAuth: false } },
  { path: '/forgot-password', name: 'forgotPassword', component: ForgotPasswordView, meta: { requiresAuth: false } },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/product-list', name: 'productList', component: ProductListView, meta: { requiresAuth: true } },
  { path: '/product-detail', name: 'productDetail', component: ProductDetailView, meta: { requiresAuth: true } },
  { path: '/product-create', name: 'productCreate', component: ProductCreateView, meta: { requiresAuth: true } },
  { path: '/order-list', name: 'orderList', component: OrderListView, meta: { requiresAuth: true } },
  { path: '/order-detail', name: 'orderDetail', component: OrderDetailView, meta: { requiresAuth: true } },
  { path: '/user-list', name: 'userList', component: UserListView, meta: { requiresAuth: true } },
  { path: '/user-profile', name: 'userProfile', component: UserProfileView, meta: { requiresAuth: true } },
  { path: '/category-manager', name: 'categoryManager', component: CategoryManagerView, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView, meta: { requiresAuth: false } }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) next('/login')
  else next()
})

export default router
