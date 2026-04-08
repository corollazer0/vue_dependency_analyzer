#!/usr/bin/env node
/**
 * generate-ecommerce-fixture.js
 * Realistic Vue 3 + Spring Boot MSA e-commerce platform with Native WebView bridge
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'test-project-ecommerce');
const FE = path.join(ROOT, 'frontend', 'src');

// 3 MSA services
const SERVICES = ['user', 'product', 'order'];
const BE = (svc) => path.join(ROOT, 'backend', `${svc}-service`, 'src', 'main', 'java', 'com', 'shop', svc);
const RES = (svc) => path.join(ROOT, 'backend', `${svc}-service`, 'src', 'main', 'resources', 'mapper');

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function w(fp, content) { ensureDir(path.dirname(fp)); fs.writeFileSync(fp, content); }
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ────────────────────────── CONFIG FILES ──────────────────────────

function genConfigs() {
  w(path.join(ROOT, '.vdarc.json'), JSON.stringify({
    vueRoot: './frontend/src',
    apiBaseUrl: '/api',
    aliases: { '@': './frontend/src' },
    nativeBridges: ['NativeApp', 'AndroidBridge', 'iOSBridge'],
    services: SERVICES.map(s => ({ id: `${s}-service`, root: `./backend/${s}-service/src/main/java`, type: 'spring-boot' }))
  }, null, 2));

  w(path.join(ROOT, 'frontend', 'package.json'), JSON.stringify({
    name: 'shop-admin', private: true, type: 'module',
    dependencies: { vue: '^3.5.0', pinia: '^3.0.0', 'vue-router': '^4.5.0', axios: '^1.7.0', '@vueuse/core': '^11.0.0' },
    devDependencies: { typescript: '^5.7.0', vite: '^6.0.0', '@vitejs/plugin-vue': '^5.0.0' }
  }, null, 2));

  w(path.join(ROOT, 'frontend', 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, jsx: 'preserve',
      baseUrl: '.', paths: { '@/*': ['src/*'] } },
    include: ['src/**/*.ts', 'src/**/*.vue']
  }, null, 2));

  w(path.join(ROOT, 'backend', 'build.gradle'), `plugins { id 'org.springframework.boot' version '3.3.0' apply false }\nallprojects { group = 'com.shop' }`);
  for (const svc of SERVICES) {
    w(path.join(ROOT, 'backend', `${svc}-service`, 'build.gradle'), `plugins { id 'org.springframework.boot' }\ndependencies { implementation 'org.springframework.boot:spring-boot-starter-web'\nimplementation 'org.mybatis.spring.boot:mybatis-spring-boot-starter:3.0.0' }`);
  }
}

// ────────────────────────── FRONTEND: STORES ──────────────────────────

const STORES = {
  auth: { state: ['token:string|null=null','user:UserInfo|null=null','isLoggedIn:boolean=false'], actions: ['login','logout','refreshToken'], getters: ['displayName','isAdmin'] },
  cart: { state: ['items:CartItem[]=[]','couponCode:string=""'], actions: ['addItem','removeItem','updateQuantity','applyCoupon','clearCart'], getters: ['totalPrice','itemCount'] },
  product: { state: ['products:Product[]=[]','filters:ProductFilters={}','loading:boolean=false','currentPage:number=1','totalPages:number=0'], actions: ['fetchProducts','setFilter','setPage'], getters: ['filteredProducts'] },
  order: { state: ['orders:Order[]=[]','currentOrder:Order|null=null','statusFilter:string=""'], actions: ['fetchOrders','fetchOrder','updateStatus','cancelOrder'], getters: ['pendingOrders','completedOrders'] },
  notification: { state: ['messages:Notification[]=[]','unreadCount:number=0'], actions: ['fetchNotifications','markAsRead','markAllRead'], getters: ['hasUnread'] },
  ui: { state: ['sidebarCollapsed:boolean=false','theme:string="dark"','locale:string="ko"'], actions: ['toggleSidebar','setTheme','setLocale'], getters: [] },
};

function genStores() {
  for (const [name, def] of Object.entries(STORES)) {
    const stateLines = def.state.map(s => { const [n, rest] = s.split(':'); const [type, def2] = rest.split('='); return `  const ${n} = ref<${type}>(${def2})`; }).join('\n');
    const actionLines = def.actions.map(a => `  async function ${a}() { /* action */ }`).join('\n');
    const getterLines = def.getters.map(g => `  const ${g} = computed(() => null)`).join('\n');
    const exports = [...def.state.map(s => s.split(':')[0]), ...def.actions, ...def.getters].join(', ');
    w(path.join(FE, 'stores', `${name}.ts`), `import { defineStore } from 'pinia'\nimport { ref, computed } from 'vue'\n\nexport const use${cap(name)}Store = defineStore('${name}', () => {\n${stateLines}\n${getterLines}\n${actionLines}\n  return { ${exports} }\n})\n`);
  }
}

// ────────────────────────── FRONTEND: COMPOSABLES ──────────────────────────

function genComposables() {
  // useAuth
  w(path.join(FE, 'composables', 'useAuth.ts'), `import { storeToRefs } from 'pinia'\nimport { useAuthStore } from '@/stores/auth'\nimport { useRouter } from 'vue-router'\nimport axios from 'axios'\n\nexport function useAuth() {\n  const authStore = useAuthStore()\n  const { token, user, isLoggedIn } = storeToRefs(authStore)\n  const router = useRouter()\n  async function login(email: string, password: string) {\n    const res = await axios.post('/api/auth/login', { email, password })\n    authStore.login()\n    router.push('/dashboard')\n  }\n  async function logout() {\n    await axios.post('/api/auth/logout')\n    authStore.logout()\n    router.push('/login')\n  }\n  return { token, user, isLoggedIn, login, logout }\n}\n`);

  // useApi
  w(path.join(FE, 'composables', 'useApi.ts'), `import axios from 'axios'\nimport { useAuthStore } from '@/stores/auth'\n\nexport function useApi() {\n  const authStore = useAuthStore()\n  const client = axios.create({ baseURL: '/api' })\n  client.interceptors.request.use(config => {\n    if (authStore.token) config.headers.Authorization = 'Bearer ' + authStore.token\n    return config\n  })\n  return { client }\n}\n`);

  // usePagination
  w(path.join(FE, 'composables', 'usePagination.ts'), `import { ref, computed } from 'vue'\n\nexport function usePagination(initialPageSize = 20) {\n  const page = ref(1)\n  const pageSize = ref(initialPageSize)\n  const total = ref(0)\n  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))\n  function setPage(p: number) { page.value = p }\n  return { page, pageSize, total, totalPages, setPage }\n}\n`);

  // useForm
  w(path.join(FE, 'composables', 'useForm.ts'), `import { ref, reactive } from 'vue'\n\nexport function useForm<T extends Record<string, unknown>>(initial: T) {\n  const form = reactive({ ...initial })\n  const isDirty = ref(false)\n  const errors = ref<Record<string, string>>({})\n  function reset() { Object.assign(form, initial); isDirty.value = false }\n  function validate() { return Object.keys(errors.value).length === 0 }\n  return { form, isDirty, errors, reset, validate }\n}\n`);

  // usePermission
  w(path.join(FE, 'composables', 'usePermission.ts'), `import { computed } from 'vue'\nimport { storeToRefs } from 'pinia'\nimport { useAuthStore } from '@/stores/auth'\n\nexport function usePermission() {\n  const authStore = useAuthStore()\n  const { user } = storeToRefs(authStore)\n  const isAdmin = computed(() => user.value?.role === 'admin')\n  function hasPermission(perm: string) { return true }\n  return { isAdmin, hasPermission }\n}\n`);

  // useWebSocket
  w(path.join(FE, 'composables', 'useWebSocket.ts'), `import { ref } from 'vue'\nimport { useNotificationStore } from '@/stores/notification'\n\nexport function useWebSocket() {\n  const connected = ref(false)\n  const notifStore = useNotificationStore()\n  function connect(url: string) { connected.value = true }\n  function disconnect() { connected.value = false }\n  return { connected, connect, disconnect }\n}\n`);

  // useNativeBridge — Native WebView integration
  w(path.join(FE, 'composables', 'useNativeBridge.ts'), `import { ref } from 'vue'\n\nexport function useNativeBridge() {\n  const isNative = ref(typeof window !== 'undefined' && !!(window as any).NativeApp)\n  const isAndroid = ref(typeof window !== 'undefined' && !!(window as any).AndroidBridge)\n  const isIOS = ref(typeof window !== 'undefined' && !!(window as any).iOSBridge)\n\n  function openCamera() { return (window as any).NativeApp.openCamera() }\n  function takePhoto() { return (window as any).AndroidBridge.takePhoto() }\n  function requestBiometric() { return (window as any).NativeApp.requestBiometric() }\n  function registerPush(token: string) { (window as any).NativeApp.registerPush(token) }\n  function requestPushPermission() { (window as any).iOSBridge.requestPushPermission() }\n  function share(title: string, url: string) { (window as any).NativeApp.share(title, url) }\n  function shareContent(data: string) { (window as any).AndroidBridge.shareContent(data) }\n  function getDeviceInfo() { return (window as any).NativeApp.getDeviceInfo() }\n  function hapticFeedback() { (window as any).NativeApp.hapticFeedback() }\n  function openDeepLink(url: string) { (window as any).AndroidBridge.openDeepLink(url) }\n  function showNativeToast(msg: string) { (window as any).iOSBridge.showToast(msg) }\n\n  return { isNative, isAndroid, isIOS, openCamera, takePhoto, requestBiometric, registerPush, requestPushPermission, share, shareContent, getDeviceInfo, hapticFeedback, openDeepLink, showNativeToast }\n}\n`);
}

// ────────────────────────── FRONTEND: API MODULES ──────────────────────────

function genApiModules() {
  w(path.join(FE, 'api', 'client.ts'), `import axios from 'axios'\nconst client = axios.create({ baseURL: '/api', timeout: 10000 })\nexport default client\n`);

  const apis = {
    auth: [['post','/api/auth/login'],['post','/api/auth/register'],['post','/api/auth/logout'],['post','/api/auth/refresh'],['get','/api/auth/me']],
    products: [['get','/api/products'],['get','/api/products/:id'],['post','/api/products'],['put','/api/products/:id'],['delete','/api/products/:id'],['get','/api/products/:id/reviews'],['post','/api/products/:id/reviews']],
    orders: [['get','/api/orders'],['get','/api/orders/:id'],['post','/api/orders'],['put','/api/orders/:id/status'],['post','/api/orders/:id/cancel'],['get','/api/orders/:id/timeline']],
    users: [['get','/api/users'],['get','/api/users/:id'],['post','/api/users'],['put','/api/users/:id'],['delete','/api/users/:id']],
    categories: [['get','/api/categories'],['get','/api/categories/tree'],['post','/api/categories'],['put','/api/categories/:id']],
    dashboard: [['get','/api/dashboard/stats'],['get','/api/dashboard/sales'],['get','/api/dashboard/recent-orders'],['get','/api/dashboard/top-products']],
  };

  for (const [mod, endpoints] of Object.entries(apis)) {
    const fns = endpoints.map(([method, url], i) => {
      const fnName = `${method}${cap(mod)}${i > 0 ? i : ''}`;
      const urlStr = url.includes(':') ? `\`${url.replace(/:(\w+)/g, '${id}')}\`` : `'${url}'`;
      return `export async function ${fnName}(${url.includes(':') ? 'id: number, ' : ''}data?: any) {\n  return axios.${method}(${urlStr}${method !== 'get' ? ', data' : ''})\n}`;
    }).join('\n\n');
    w(path.join(FE, 'api', `${mod}.ts`), `import axios from 'axios'\n\n${fns}\n`);
  }
}

// ────────────────────────── FRONTEND: ROUTER ──────────────────────────

function genRouter() {
  const views = ['Home','Login','Register','ForgotPassword','Dashboard','ProductList','ProductDetail','ProductCreate',
    'OrderList','OrderDetail','UserList','UserProfile','CategoryManager','Settings','NotFound'];

  const imports = views.map(v => `const ${v}View = () => import('@/components/${v === 'Home' ? 'dashboard/DashboardPage' : v.includes('Product') ? 'product/' + v : v.includes('Order') ? 'order/' + v : v.includes('User') ? 'user/' + v : v.includes('Category') ? 'product/CategoryManager' : v.includes('Dashboard') ? 'dashboard/DashboardPage' : 'auth/' + v}.vue')`).join('\n');

  const routes = views.map(v => {
    const p = v === 'Home' ? '/' : v === 'NotFound' ? '/:pathMatch(.*)*' : `/${v.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)}`;
    return `  { path: '${p}', name: '${v.charAt(0).toLowerCase() + v.slice(1)}', component: ${v}View, meta: { requiresAuth: ${!['Login','Register','ForgotPassword','NotFound'].includes(v)} } }`;
  }).join(',\n');

  w(path.join(FE, 'router', 'index.ts'), `import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'\nimport { useAuthStore } from '@/stores/auth'\n\n${imports}\n\nconst routes: RouteRecordRaw[] = [\n${routes}\n]\n\nconst router = createRouter({ history: createWebHistory(), routes })\n\nrouter.beforeEach((to, from, next) => {\n  const authStore = useAuthStore()\n  if (to.meta.requiresAuth && !authStore.isLoggedIn) next('/login')\n  else next()\n})\n\nexport default router\n`);
}

// ────────────────────────── FRONTEND: COMPONENTS ──────────────────────────

function vueComponent(name, { imports = [], stores = [], composables = [], emits = [], props = [], apiCalls = [], children = [], nativeCalls = [], provide = null, inject = null, routerPush = null, directive = false }) {
  const importLines = [
    ...imports.map(i => typeof i === 'string' ? i : i),
    ...stores.map(s => `import { use${cap(s)}Store } from '@/stores/${s}'`),
    ...composables.map(c => `import { ${c} } from '@/composables/${c}'`),
    ...(stores.length > 0 ? ["import { storeToRefs } from 'pinia'"] : []),
    ...(routerPush ? ["import { useRouter } from 'vue-router'"] : []),
    ...(provide || inject ? ["import { provide as vueProvide, inject as vueInject, ref } from 'vue'"] : []),
  ];

  const setupLines = [
    ...stores.map(s => `const ${s}Store = use${cap(s)}Store()\nconst { ${STORES[s] ? STORES[s].state.slice(0, 2).map(st => st.split(':')[0]).join(', ') : s} } = storeToRefs(${s}Store)`),
    ...composables.map(c => `const { ${c === 'useNativeBridge' ? 'isNative, openCamera, share, hapticFeedback' : c === 'useAuth' ? 'isLoggedIn, login, logout' : c.replace('use', '').charAt(0).toLowerCase() + c.replace('use', '').slice(1)} } = ${c}()`),
    ...(routerPush ? [`const router = useRouter()\nfunction navigate() { router.push('${routerPush}') }`] : []),
    ...(provide ? [`vueProvide('${provide}', ref('value'))`] : []),
    ...(inject ? [`const ${inject}Value = vueInject('${inject}')`] : []),
    ...(props.length ? [`const props = defineProps<{ ${props.map(p => `${p}: string`).join('; ')} }>()`] : []),
    ...(emits.length ? [`const emit = defineEmits([${emits.map(e => `'${e}'`).join(', ')}])`] : []),
    ...apiCalls.map((a, i) => `async function apiCall${i}() {\n  const res${i} = await axios.${a[0]}('${a[1]}'${a[0] !== 'get' ? ', {}' : ''})\n  return res${i}.data\n}`),
    ...nativeCalls.map((nc, i) => `function nativeAction${i}() {\n  ${nc}\n}`),
  ];

  const childTags = children.map(c => {
    const kebab = c.name.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
    const events = (c.events || []).map(e => ` @${e}="() => {}"`).join('');
    return `      <${kebab}${events} />`;
  }).join('\n');

  const childImports = children.map(c => `import ${c.name} from './${c.path || c.name}.vue'`);

  return `<script setup lang="ts">
${[...importLines, ...childImports, ...(apiCalls.length ? ["import axios from 'axios'"] : [])].join('\n')}

${setupLines.join('\n')}
</script>

<template>
  <div class="${name.toLowerCase()}">
    <h2>{{ '${name}' }}</h2>
${childTags}
${directive ? '    <div v-permission="\'admin\'">Admin only</div>' : ''}
  </div>
</template>
`;
}

function genComponents() {
  const comps = [
    // Layout
    { dir: 'layout', name: 'AppLayout', opts: { stores: ['ui'], children: [{ name: 'AppSidebar', path: '../layout/AppSidebar' }, { name: 'AppHeader', path: '../layout/AppHeader' }], provide: 'layoutState' } },
    { dir: 'layout', name: 'AppSidebar', opts: { stores: ['ui', 'auth'], composables: ['usePermission'], inject: 'layoutState', routerPush: '/dashboard' } },
    { dir: 'layout', name: 'AppHeader', opts: { stores: ['auth', 'notification'], composables: ['useNativeBridge'], nativeCalls: ['window.NativeApp.getDeviceInfo()'], routerPush: '/profile' } },
    { dir: 'layout', name: 'AppBreadcrumb', opts: { imports: ["import { useRoute } from 'vue-router'"] } },
    { dir: 'layout', name: 'AppFooter', opts: {} },

    // Common
    { dir: 'common', name: 'BaseTable', opts: { emits: ['sort-change', 'page-change', 'row-click'], props: ['columns', 'data'] } },
    { dir: 'common', name: 'BaseForm', opts: { emits: ['submit', 'cancel', 'validate'], composables: ['useForm'] } },
    { dir: 'common', name: 'BaseModal', opts: { emits: ['close', 'confirm'], provide: 'modalState' } },
    { dir: 'common', name: 'BaseUpload', opts: { emits: ['success', 'error'], nativeCalls: ['window.NativeApp.openCamera()'] } },
    { dir: 'common', name: 'SearchInput', opts: { emits: ['search'] } },
    { dir: 'common', name: 'StatusBadge', opts: { props: ['status', 'type'] } },
    { dir: 'common', name: 'ConfirmDialog', opts: { emits: ['confirm', 'cancel'], inject: 'modalState' } },
    { dir: 'common', name: 'LoadingOverlay', opts: {} },
    { dir: 'common', name: 'ErrorBoundary', opts: { emits: ['retry'] } },

    // Product
    { dir: 'product', name: 'ProductList', opts: { stores: ['product'], composables: ['usePagination'], apiCalls: [['get','/api/products']], children: [{ name: 'BaseTable', path: '../common/BaseTable', events: ['sort-change','page-change'] }, { name: 'ProductFilter', events: ['filter-change'] }], routerPush: '/product-detail', directive: true } },
    { dir: 'product', name: 'ProductForm', opts: { emits: ['submit', 'cancel'], apiCalls: [['post','/api/products'],['put','/api/products/:id']], composables: ['useForm'], children: [{ name: 'BaseUpload', path: '../common/BaseUpload', events: ['success'] }] } },
    { dir: 'product', name: 'ProductCard', opts: { props: ['product'], stores: ['cart'], routerPush: '/product-detail', nativeCalls: ['window.NativeApp.share("Product", location.href)'] } },
    { dir: 'product', name: 'ProductFilter', opts: { emits: ['filter-change'], apiCalls: [['get','/api/categories/tree']] } },
    { dir: 'product', name: 'ProductImageGallery', opts: { props: ['images'], nativeCalls: ['window.AndroidBridge.openDeepLink("gallery")'] } },
    { dir: 'product', name: 'ProductVariants', opts: { emits: ['variant-change'], props: ['variants'] } },
    { dir: 'product', name: 'ProductReviews', opts: { apiCalls: [['get','/api/products/:id/reviews'],['post','/api/products/:id/reviews']], emits: ['review-submitted'] } },
    { dir: 'product', name: 'CategoryManager', opts: { apiCalls: [['get','/api/categories'],['post','/api/categories'],['put','/api/categories/:id']], directive: true } },

    // Order
    { dir: 'order', name: 'OrderList', opts: { stores: ['order'], composables: ['usePagination'], apiCalls: [['get','/api/orders']], children: [{ name: 'BaseTable', path: '../common/BaseTable', events: ['row-click','page-change'] }], directive: true } },
    { dir: 'order', name: 'OrderDetail', opts: { stores: ['order'], apiCalls: [['get','/api/orders/:id']], children: [{ name: 'OrderTimeline', events: ['status-change'] }, { name: 'OrderItems' }, { name: 'OrderShipping' }, { name: 'OrderPayment', events: ['refund-requested'] }] } },
    { dir: 'order', name: 'OrderTimeline', opts: { emits: ['status-change'], apiCalls: [['put','/api/orders/:id/status']] } },
    { dir: 'order', name: 'OrderItems', opts: { props: ['items'], routerPush: '/product-detail' } },
    { dir: 'order', name: 'OrderShipping', opts: { props: ['shipping'] } },
    { dir: 'order', name: 'OrderPayment', opts: { emits: ['refund-requested'], apiCalls: [['post','/api/payments/refund']] } },

    // User
    { dir: 'user', name: 'UserList', opts: { apiCalls: [['get','/api/users']], composables: ['usePagination'], children: [{ name: 'BaseTable', path: '../common/BaseTable', events: ['row-click'] }, { name: 'SearchInput', path: '../common/SearchInput', events: ['search'] }], directive: true } },
    { dir: 'user', name: 'UserForm', opts: { emits: ['submit', 'cancel'], apiCalls: [['post','/api/users'],['put','/api/users/:id']], composables: ['useForm'] } },
    { dir: 'user', name: 'UserProfile', opts: { stores: ['auth'], composables: ['useAuth'], apiCalls: [['get','/api/auth/me']], nativeCalls: ['window.NativeApp.requestBiometric()'] } },
    { dir: 'user', name: 'UserPermissions', opts: { apiCalls: [['get','/api/users/:id']], directive: true } },

    // Dashboard
    { dir: 'dashboard', name: 'DashboardPage', opts: { stores: ['notification'], children: [{ name: 'StatsCards' }, { name: 'SalesChart' }, { name: 'OrdersWidget' }, { name: 'TopProducts' }] } },
    { dir: 'dashboard', name: 'StatsCards', opts: { apiCalls: [['get','/api/dashboard/stats']] } },
    { dir: 'dashboard', name: 'SalesChart', opts: { apiCalls: [['get','/api/dashboard/sales']] } },
    { dir: 'dashboard', name: 'OrdersWidget', opts: { apiCalls: [['get','/api/dashboard/recent-orders']], routerPush: '/order-detail' } },
    { dir: 'dashboard', name: 'TopProducts', opts: { apiCalls: [['get','/api/dashboard/top-products']] } },

    // Auth
    { dir: 'auth', name: 'LoginPage', opts: { composables: ['useAuth'], apiCalls: [['post','/api/auth/login']], routerPush: '/dashboard', nativeCalls: ['window.NativeApp.requestBiometric()'] } },
    { dir: 'auth', name: 'RegisterPage', opts: { apiCalls: [['post','/api/auth/register']], routerPush: '/login' } },
    { dir: 'auth', name: 'ForgotPassword', opts: { apiCalls: [['post','/api/auth/forgot-password']] } },
    { dir: 'auth', name: 'ResetPassword', opts: { apiCalls: [['post','/api/auth/reset-password']], routerPush: '/login' } },

    // Native WebView bridge components
    { dir: 'native', name: 'NativeBridge', opts: { composables: ['useNativeBridge'], nativeCalls: ['window.NativeApp.getDeviceInfo()', 'window.AndroidBridge.getAppVersion()'] } },
    { dir: 'native', name: 'CameraCapture', opts: { emits: ['captured', 'error'], nativeCalls: ['window.NativeApp.openCamera()', 'window.AndroidBridge.takePhoto()', 'window.iOSBridge.captureImage()'] } },
    { dir: 'native', name: 'BiometricAuth', opts: { emits: ['authenticated', 'failed'], composables: ['useAuth'], nativeCalls: ['window.NativeApp.requestBiometric()', 'window.AndroidBridge.fingerprint()', 'window.iOSBridge.faceId()'] } },
    { dir: 'native', name: 'PushNotification', opts: { stores: ['notification'], nativeCalls: ['window.NativeApp.registerPush("token")', 'window.iOSBridge.requestPushPermission()', 'window.AndroidBridge.getFcmToken()'] } },
    { dir: 'native', name: 'ShareSheet', opts: { emits: ['shared'], nativeCalls: ['window.NativeApp.share("title", "url")', 'window.AndroidBridge.shareContent("data")', 'window.iOSBridge.shareVia("airdrop")'] } },
    { dir: 'native', name: 'NativeScanner', opts: { emits: ['scanned', 'error'], nativeCalls: ['window.NativeApp.openScanner()', 'window.AndroidBridge.scanBarcode()', 'window.iOSBridge.scanQR()'] } },
    { dir: 'native', name: 'NativePayment', opts: { emits: ['payment-success', 'payment-error'], nativeCalls: ['window.NativeApp.requestPayment()', 'window.AndroidBridge.googlePay()', 'window.iOSBridge.applePay()'] } },
    { dir: 'native', name: 'NativeMap', opts: { props: ['latitude', 'longitude'], nativeCalls: ['window.NativeApp.openMap()', 'window.AndroidBridge.showGoogleMaps()', 'window.iOSBridge.showAppleMaps()'] } },
  ];

  for (const comp of comps) {
    w(path.join(FE, 'components', comp.dir, `${comp.name}.vue`), vueComponent(comp.name, comp.opts));
  }
}

// ────────────────────────── FRONTEND: TYPES, DIRECTIVES, UTILS ──────────────────────────

function genFrontendExtras() {
  // Types with intentional mismatches
  w(path.join(FE, 'types', 'api.ts'), `export interface UserResponse {\n  id: number\n  username: string\n  email: string\n  displayName: string\n  role: string\n  avatarUrl: string\n  isActive: boolean\n  // missing: lastLoginIp (exists in backend)\n}\n\nexport interface ProductResponse {\n  id: number\n  title: string\n  description: string\n  price: number\n  stock: number\n  categoryId: number\n  images: string[]\n  rating: number\n  reviewCount: number\n  // missing: internalSku (exists in backend)\n}\n\nexport interface OrderResponse {\n  id: number\n  userId: number\n  items: OrderItemResponse[]\n  totalAmount: number\n  status: string\n  shippingAddress: string\n  trackingNumber: string\n  createdAt: string\n  paidAt: string\n  frontendNote: string // NOT in backend\n}\n\nexport interface OrderItemResponse {\n  id: number\n  productId: number\n  productName: string\n  quantity: number\n  unitPrice: number\n}\n\nexport interface DashboardStatsResponse {\n  totalOrders: number\n  totalRevenue: number\n  totalUsers: number\n  totalProducts: number\n  conversionRate: number\n}\n\nexport interface CategoryResponse {\n  id: number\n  name: string\n  parentId: number | null\n  children: CategoryResponse[]\n}\n`);

  // Directive
  w(path.join(FE, 'directives', 'permission.ts'), `import type { Directive } from 'vue'\n\nexport const vPermission: Directive = {\n  mounted(el, binding) {\n    const required = binding.value\n    // role check logic\n    if (!required) el.style.display = 'none'\n  }\n}\n`);

  // Utils
  w(path.join(FE, 'utils', 'format.ts'), `export function formatCurrency(n: number) { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n) }\nexport function formatDate(d: string) { return new Date(d).toLocaleDateString('ko-KR') }\n`);
  w(path.join(FE, 'utils', 'validate.ts'), `export function isEmail(v: string) { return /^[^@]+@[^@]+\\.[^@]+$/.test(v) }\nexport function isPhone(v: string) { return /^01[0-9]{8,9}$/.test(v) }\n`);
  w(path.join(FE, 'utils', 'constants.ts'), `export const API_BASE = '/api'\nexport const ORDER_STATUS = { PENDING: 'pending', PAID: 'paid', SHIPPED: 'shipped', DELIVERED: 'delivered', CANCELLED: 'cancelled' } as const\n`);

  // main.ts
  w(path.join(FE, 'main.ts'), `import { createApp } from 'vue'\nimport { createPinia } from 'pinia'\nimport App from './App.vue'\nimport router from './router'\nimport { vPermission } from './directives/permission'\n\nconst app = createApp(App)\napp.use(createPinia())\napp.use(router)\napp.directive('permission', vPermission)\napp.mount('#app')\n`);

  // App.vue
  w(path.join(FE, 'App.vue'), `<script setup lang="ts">\nimport AppLayout from '@/components/layout/AppLayout.vue'\n</script>\n<template><AppLayout /></template>\n`);
}

// ────────────────────────── BACKEND: JAVA SERVICES ──────────────────────────

function genBackend() {
  // ── USER SERVICE ──
  const userSvc = BE('user');
  w(path.join(userSvc, 'controller', 'AuthController.java'), javaController('com.shop.user.controller', 'Auth', '/api/auth', 'AuthService', [
    { method: 'Post', path: '/login', ret: 'LoginResponse', param: 'LoginRequest' },
    { method: 'Post', path: '/register', ret: 'UserResponse', param: 'RegisterRequest' },
    { method: 'Post', path: '/logout', ret: 'void' },
    { method: 'Post', path: '/refresh', ret: 'LoginResponse' },
    { method: 'Get', path: '/me', ret: 'UserResponse' },
  ]));
  w(path.join(userSvc, 'controller', 'UserController.java'), javaController('com.shop.user.controller', 'User', '/api/users', 'UserService', [
    { method: 'Get', path: '', ret: 'List<UserResponse>' },
    { method: 'Get', path: '/{id}', ret: 'UserResponse' },
    { method: 'Post', path: '', ret: 'UserResponse', param: 'CreateUserRequest' },
    { method: 'Put', path: '/{id}', ret: 'UserResponse', param: 'UpdateUserRequest' },
    { method: 'Delete', path: '/{id}', ret: 'void' },
  ]));
  w(path.join(userSvc, 'service', 'UserService.java'), javaService('com.shop.user.service', 'User', ['UserRepository','EmailService'], true, null, 'UserRegisteredEvent'));
  w(path.join(userSvc, 'service', 'AuthService.java'), javaService('com.shop.user.service', 'Auth', ['UserRepository'], true));
  w(path.join(userSvc, 'service', 'EmailService.java'), javaService('com.shop.user.service', 'Email', [], false, 'UserRegisteredEvent'));
  w(path.join(userSvc, 'repository', 'UserRepository.java'), javaRepo('com.shop.user.repository', 'User'));
  w(path.join(userSvc, 'mapper', 'UserMapper.java'), javaMapper('com.shop.user.mapper', 'User'));
  w(path.join(userSvc, 'model', 'User.java'), javaModel('com.shop.user.model', 'User', ['username:String','email:String','passwordHash:String','displayName:String','role:String','isActive:boolean','lastLoginIp:String']));
  w(path.join(userSvc, 'dto', 'UserResponse.java'), javaDto('com.shop.user.dto', 'UserResponse', ['id:Long','username:String','email:String','displayName:String','role:String','avatarUrl:String','isActive:boolean','lastLoginIp:String']));
  w(path.join(userSvc, 'dto', 'LoginRequest.java'), javaDto('com.shop.user.dto', 'LoginRequest', ['email:String','password:String']));
  w(path.join(userSvc, 'dto', 'LoginResponse.java'), javaDto('com.shop.user.dto', 'LoginResponse', ['token:String','refreshToken:String','user:UserResponse']));
  w(path.join(userSvc, 'dto', 'RegisterRequest.java'), javaDto('com.shop.user.dto', 'RegisterRequest', ['username:String','email:String','password:String','displayName:String']));
  w(path.join(userSvc, 'dto', 'CreateUserRequest.java'), javaDto('com.shop.user.dto', 'CreateUserRequest', ['username:String','email:String','password:String','role:String']));
  w(path.join(userSvc, 'dto', 'UpdateUserRequest.java'), javaDto('com.shop.user.dto', 'UpdateUserRequest', ['displayName:String','email:String','role:String','isActive:boolean']));
  w(path.join(userSvc, 'event', 'UserRegisteredEvent.java'), javaEvent('com.shop.user.event', 'UserRegistered', ['userId:Long','email:String']));
  w(path.join(userSvc, 'config', 'SecurityConfig.java'), javaConfig('com.shop.user.config', 'Security', ['PasswordEncoder','AuthenticationManager']));
  w(path.join(RES('user'), 'UserMapper.xml'), mybatisXml('com.shop.user.mapper.UserMapper', [
    { id: 'findAll', type: 'select', sql: 'SELECT * FROM users' },
    { id: 'findById', type: 'select', sql: 'SELECT u.*, r.role_name FROM users u JOIN user_roles r ON u.id = r.user_id WHERE u.id = #{id}' },
    { id: 'insert', type: 'insert', sql: 'INSERT INTO users (username, email, password_hash, display_name) VALUES (#{username}, #{email}, #{passwordHash}, #{displayName})' },
    { id: 'update', type: 'update', sql: 'UPDATE users SET display_name = #{displayName}, email = #{email} WHERE id = #{id}' },
    { id: 'delete', type: 'delete', sql: 'DELETE FROM users WHERE id = #{id}' },
  ]));

  // ── PRODUCT SERVICE ──
  const prodSvc = BE('product');
  w(path.join(prodSvc, 'controller', 'ProductController.java'), javaController('com.shop.product.controller', 'Product', '/api/products', 'ProductService', [
    { method: 'Get', path: '', ret: 'List<ProductResponse>' },
    { method: 'Get', path: '/{id}', ret: 'ProductResponse' },
    { method: 'Post', path: '', ret: 'ProductResponse', param: 'ProductRequest' },
    { method: 'Put', path: '/{id}', ret: 'ProductResponse', param: 'ProductRequest' },
    { method: 'Delete', path: '/{id}', ret: 'void' },
    { method: 'Get', path: '/{id}/reviews', ret: 'List<ReviewResponse>' },
    { method: 'Post', path: '/{id}/reviews', ret: 'ReviewResponse', param: 'ReviewRequest' },
  ]));
  w(path.join(prodSvc, 'controller', 'CategoryController.java'), javaController('com.shop.product.controller', 'Category', '/api/categories', 'CategoryService', [
    { method: 'Get', path: '', ret: 'List<CategoryResponse>' },
    { method: 'Get', path: '/tree', ret: 'List<CategoryTreeResponse>' },
    { method: 'Post', path: '', ret: 'CategoryResponse', param: 'CategoryRequest' },
    { method: 'Put', path: '/{id}', ret: 'CategoryResponse', param: 'CategoryRequest' },
  ]));
  w(path.join(prodSvc, 'service', 'ProductService.java'), javaService('com.shop.product.service', 'Product', ['ProductRepository','CategoryService'], true, null, 'ProductUpdatedEvent'));
  w(path.join(prodSvc, 'service', 'CategoryService.java'), javaService('com.shop.product.service', 'Category', ['CategoryRepository'], true));
  w(path.join(prodSvc, 'service', 'SearchService.java'), javaService('com.shop.product.service', 'Search', ['ProductRepository'], false, 'ProductUpdatedEvent'));
  w(path.join(prodSvc, 'repository', 'ProductRepository.java'), javaRepo('com.shop.product.repository', 'Product'));
  w(path.join(prodSvc, 'repository', 'CategoryRepository.java'), javaRepo('com.shop.product.repository', 'Category'));
  w(path.join(prodSvc, 'mapper', 'ProductMapper.java'), javaMapper('com.shop.product.mapper', 'Product'));
  w(path.join(prodSvc, 'mapper', 'CategoryMapper.java'), javaMapper('com.shop.product.mapper', 'Category'));
  w(path.join(prodSvc, 'model', 'Product.java'), javaModel('com.shop.product.model', 'Product', ['title:String','description:String','price:BigDecimal','stock:int','categoryId:Long','images:String','rating:double','reviewCount:int','internalSku:String']));
  w(path.join(prodSvc, 'model', 'Category.java'), javaModel('com.shop.product.model', 'Category', ['name:String','parentId:Long','sortOrder:int']));
  w(path.join(prodSvc, 'model', 'Review.java'), javaModel('com.shop.product.model', 'Review', ['productId:Long','userId:Long','rating:int','content:String']));
  w(path.join(prodSvc, 'dto', 'ProductResponse.java'), javaDto('com.shop.product.dto', 'ProductResponse', ['id:Long','title:String','description:String','price:BigDecimal','stock:int','categoryId:Long','images:List<String>','rating:double','reviewCount:int','internalSku:String']));
  w(path.join(prodSvc, 'dto', 'ProductRequest.java'), javaDto('com.shop.product.dto', 'ProductRequest', ['title:String','description:String','price:BigDecimal','stock:int','categoryId:Long','images:List<String>']));
  w(path.join(prodSvc, 'dto', 'CategoryResponse.java'), javaDto('com.shop.product.dto', 'CategoryResponse', ['id:Long','name:String','parentId:Long']));
  w(path.join(prodSvc, 'dto', 'CategoryTreeResponse.java'), javaDto('com.shop.product.dto', 'CategoryTreeResponse', ['id:Long','name:String','children:List<CategoryTreeResponse>']));
  w(path.join(prodSvc, 'dto', 'ReviewResponse.java'), javaDto('com.shop.product.dto', 'ReviewResponse', ['id:Long','userId:Long','rating:int','content:String','createdAt:String']));
  w(path.join(prodSvc, 'dto', 'ReviewRequest.java'), javaDto('com.shop.product.dto', 'ReviewRequest', ['rating:int','content:String']));
  w(path.join(prodSvc, 'event', 'ProductUpdatedEvent.java'), javaEvent('com.shop.product.event', 'ProductUpdated', ['productId:Long','action:String']));
  w(path.join(RES('product'), 'ProductMapper.xml'), mybatisXml('com.shop.product.mapper.ProductMapper', [
    { id: 'findAll', type: 'select', sql: 'SELECT * FROM products' },
    { id: 'findById', type: 'select', sql: 'SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = #{id}' },
    { id: 'insert', type: 'insert', sql: 'INSERT INTO products (title, description, price, stock, category_id) VALUES (#{title}, #{description}, #{price}, #{stock}, #{categoryId})' },
    { id: 'update', type: 'update', sql: 'UPDATE products SET title=#{title}, price=#{price}, stock=#{stock} WHERE id = #{id}' },
    { id: 'delete', type: 'delete', sql: 'DELETE FROM products WHERE id = #{id}' },
  ]));
  w(path.join(RES('product'), 'CategoryMapper.xml'), mybatisXml('com.shop.product.mapper.CategoryMapper', [
    { id: 'findAll', type: 'select', sql: 'SELECT * FROM categories' },
    { id: 'findTree', type: 'select', sql: 'SELECT c.*, p.name as parent_name FROM categories c LEFT JOIN categories p ON c.parent_id = p.id' },
    { id: 'insert', type: 'insert', sql: 'INSERT INTO categories (name, parent_id) VALUES (#{name}, #{parentId})' },
  ]));

  // ── ORDER SERVICE ──
  const orderSvc = BE('order');
  w(path.join(orderSvc, 'controller', 'OrderController.java'), javaController('com.shop.order.controller', 'Order', '/api/orders', 'OrderService', [
    { method: 'Get', path: '', ret: 'List<OrderResponse>' },
    { method: 'Get', path: '/{id}', ret: 'OrderResponse' },
    { method: 'Post', path: '', ret: 'OrderResponse', param: 'CreateOrderRequest' },
    { method: 'Put', path: '/{id}/status', ret: 'OrderResponse', param: 'UpdateStatusRequest' },
    { method: 'Post', path: '/{id}/cancel', ret: 'OrderResponse' },
    { method: 'Get', path: '/{id}/timeline', ret: 'List<TimelineEntry>' },
  ]));
  w(path.join(orderSvc, 'controller', 'PaymentController.java'), javaController('com.shop.order.controller', 'Payment', '/api/payments', 'PaymentService', [
    { method: 'Post', path: '/process', ret: 'PaymentResponse', param: 'PaymentRequest' },
    { method: 'Post', path: '/refund', ret: 'RefundResponse', param: 'RefundRequest' },
  ]));
  w(path.join(orderSvc, 'controller', 'DashboardController.java'), javaController('com.shop.order.controller', 'Dashboard', '/api/dashboard', 'DashboardService', [
    { method: 'Get', path: '/stats', ret: 'DashboardStatsResponse' },
    { method: 'Get', path: '/sales', ret: 'List<SalesDataPoint>' },
    { method: 'Get', path: '/recent-orders', ret: 'List<OrderResponse>' },
    { method: 'Get', path: '/top-products', ret: 'List<TopProductResponse>' },
  ]));
  w(path.join(orderSvc, 'service', 'OrderService.java'), javaService('com.shop.order.service', 'Order', ['OrderRepository','PaymentService'], true, null, 'OrderCreatedEvent'));
  w(path.join(orderSvc, 'service', 'PaymentService.java'), javaService('com.shop.order.service', 'Payment', ['OrderRepository'], true, null, 'OrderPaidEvent'));
  w(path.join(orderSvc, 'service', 'DashboardService.java'), javaService('com.shop.order.service', 'Dashboard', ['OrderRepository'], true));
  w(path.join(orderSvc, 'service', 'NotificationService.java'), javaService('com.shop.order.service', 'Notification', [], false, 'OrderCreatedEvent'));
  w(path.join(orderSvc, 'service', 'ShippingNotifier.java'), javaService('com.shop.order.service', 'ShippingNotifier', [], false, 'OrderPaidEvent'));
  w(path.join(orderSvc, 'repository', 'OrderRepository.java'), javaRepo('com.shop.order.repository', 'Order'));
  w(path.join(orderSvc, 'mapper', 'OrderMapper.java'), javaMapper('com.shop.order.mapper', 'Order'));
  w(path.join(orderSvc, 'model', 'Order.java'), javaModel('com.shop.order.model', 'Order', ['userId:Long','totalAmount:BigDecimal','status:String','shippingAddress:String','trackingNumber:String','paidAt:LocalDateTime']));
  w(path.join(orderSvc, 'model', 'OrderItem.java'), javaModel('com.shop.order.model', 'OrderItem', ['orderId:Long','productId:Long','productName:String','quantity:int','unitPrice:BigDecimal']));
  w(path.join(orderSvc, 'model', 'Payment.java'), javaModel('com.shop.order.model', 'Payment', ['orderId:Long','amount:BigDecimal','method:String','transactionId:String','status:String']));
  w(path.join(orderSvc, 'dto', 'OrderResponse.java'), javaDto('com.shop.order.dto', 'OrderResponse', ['id:Long','userId:Long','items:List<OrderItemResponse>','totalAmount:BigDecimal','status:String','shippingAddress:String','trackingNumber:String','createdAt:String','paidAt:String','internalNote:String']));
  w(path.join(orderSvc, 'dto', 'CreateOrderRequest.java'), javaDto('com.shop.order.dto', 'CreateOrderRequest', ['items:List<OrderItemRequest>','shippingAddress:String','couponCode:String']));
  w(path.join(orderSvc, 'dto', 'DashboardStatsResponse.java'), javaDto('com.shop.order.dto', 'DashboardStatsResponse', ['totalOrders:int','totalRevenue:BigDecimal','totalUsers:int','totalProducts:int','conversionRate:double']));
  w(path.join(orderSvc, 'dto', 'PaymentRequest.java'), javaDto('com.shop.order.dto', 'PaymentRequest', ['orderId:Long','amount:BigDecimal','method:String']));
  w(path.join(orderSvc, 'event', 'OrderCreatedEvent.java'), javaEvent('com.shop.order.event', 'OrderCreated', ['orderId:Long','userId:Long','totalAmount:BigDecimal']));
  w(path.join(orderSvc, 'event', 'OrderPaidEvent.java'), javaEvent('com.shop.order.event', 'OrderPaid', ['orderId:Long','paymentId:Long','amount:BigDecimal']));
  w(path.join(RES('order'), 'OrderMapper.xml'), mybatisXml('com.shop.order.mapper.OrderMapper', [
    { id: 'findAll', type: 'select', sql: 'SELECT * FROM orders' },
    { id: 'findById', type: 'select', sql: 'SELECT o.*, p.status as payment_status FROM orders o LEFT JOIN payments p ON o.id = p.order_id WHERE o.id = #{id}' },
    { id: 'findItems', type: 'select', sql: 'SELECT * FROM order_items WHERE order_id = #{orderId}' },
    { id: 'insert', type: 'insert', sql: 'INSERT INTO orders (user_id, total_amount, status, shipping_address) VALUES (#{userId}, #{totalAmount}, #{status}, #{shippingAddress})' },
    { id: 'insertItem', type: 'insert', sql: 'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (#{orderId}, #{productId}, #{productName}, #{quantity}, #{unitPrice})' },
    { id: 'updateStatus', type: 'update', sql: 'UPDATE orders SET status = #{status} WHERE id = #{id}' },
    { id: 'insertPayment', type: 'insert', sql: 'INSERT INTO payments (order_id, amount, method, transaction_id, status) VALUES (#{orderId}, #{amount}, #{method}, #{transactionId}, #{status})' },
  ]));
}

// ────────────────────────── JAVA HELPERS ──────────────────────────

function javaController(pkg, domain, basePath, serviceName, endpoints) {
  const svcVar = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
  const eps = endpoints.map(ep => {
    const params = (ep.path.includes('{id}') ? '@PathVariable Long id' : '') + (ep.param ? `${ep.path.includes('{id}') ? ', ' : ''}@RequestBody ${ep.param} request` : '');
    return `    @${ep.method}Mapping("${ep.path}")\n    public ResponseEntity<${ep.ret}> ${ep.method.toLowerCase()}${domain}${ep.path.replace(/[/{}-]/g, '')}(${params}) {\n        return ResponseEntity.ok(${svcVar}.handle());\n    }`;
  }).join('\n\n');
  return `package ${pkg};\n\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.http.ResponseEntity;\nimport ${pkg.replace('.controller', '.service')}.${serviceName};\nimport java.util.List;\n\n@RestController\n@RequestMapping("${basePath}")\npublic class ${domain}Controller {\n    private final ${serviceName} ${svcVar};\n    public ${domain}Controller(${serviceName} ${svcVar}) { this.${svcVar} = ${svcVar}; }\n\n${eps}\n}\n`;
}

function javaService(pkg, domain, deps, lombok, listensTo, publishes) {
  const depFields = deps.map(d => `    private final ${d} ${d.charAt(0).toLowerCase() + d.slice(1)};`).join('\n');
  const imports = [
    ...(lombok ? ['import lombok.RequiredArgsConstructor;'] : []),
    'import org.springframework.stereotype.Service;',
    ...(publishes ? ['import org.springframework.context.ApplicationEventPublisher;'] : []),
    ...(listensTo ? ['import org.springframework.context.event.EventListener;'] : []),
  ].join('\n');
  const publishField = publishes ? `    private final ApplicationEventPublisher eventPublisher;\n` : '';
  const publishMethod = publishes ? `\n    public void doAction() {\n        eventPublisher.publishEvent(new ${publishes}());\n    }` : '';
  const listenerMethod = listensTo ? `\n    @EventListener\n    public void handle${listensTo}(${listensTo} event) {\n        // handle event\n    }` : '';
  const constructorAnnotation = lombok ? '@RequiredArgsConstructor\n' : '';
  return `package ${pkg};\n\n${imports}\n\n@Service\n${constructorAnnotation}public class ${domain}Service {\n${depFields}\n${publishField}${publishMethod}${listenerMethod}\n}\n`;
}

function javaRepo(pkg, domain) {
  return `package ${pkg};\n\nimport org.springframework.stereotype.Repository;\n\n@Repository\npublic interface ${domain}Repository {\n    ${domain} findById(Long id);\n    java.util.List<${domain}> findAll();\n    void save(${domain} entity);\n    void deleteById(Long id);\n}\n`;
}

function javaMapper(pkg, domain) {
  return `package ${pkg};\n\nimport org.apache.ibatis.annotations.Mapper;\nimport java.util.List;\n\n@Mapper\npublic interface ${domain}Mapper {\n    ${domain} findById(Long id);\n    List<${domain}> findAll();\n    void insert(${domain} entity);\n    void update(${domain} entity);\n    void deleteById(Long id);\n}\n`;
}

function javaModel(pkg, name, fields) {
  const flds = ['private Long id;', ...fields.map(f => { const [n, t] = f.split(':'); return `    private ${t} ${n};`; })].join('\n');
  return `package ${pkg};\n\nimport jakarta.persistence.*;\n\n@Entity\n@Table(name = "${name.toLowerCase()}s")\npublic class ${name} {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    ${flds}\n}\n`;
}

function javaDto(pkg, name, fields) {
  const flds = fields.map(f => { const [n, t] = f.split(':'); return `    private ${t} ${n};`; }).join('\n');
  return `package ${pkg};\n\npublic class ${name} {\n${flds}\n}\n`;
}

function javaEvent(pkg, name, fields) {
  const flds = fields.map(f => { const [n, t] = f.split(':'); return `    private final ${t} ${n};`; }).join('\n');
  return `package ${pkg};\n\npublic class ${name}Event {\n${flds}\n    public ${name}Event(${fields.map(f => { const [n, t] = f.split(':'); return `${t} ${n}`; }).join(', ')}) {\n        ${fields.map(f => { const n = f.split(':')[0]; return `this.${n} = ${n};`; }).join(' ')}\n    }\n}\n`;
}

function javaConfig(pkg, name, beans) {
  const beanMethods = beans.map(b => `    @Bean\n    public ${b} ${b.charAt(0).toLowerCase() + b.slice(1)}() {\n        return null; // configured externally\n    }`).join('\n\n');
  return `package ${pkg};\n\nimport org.springframework.context.annotation.Bean;\nimport org.springframework.context.annotation.Configuration;\n\n@Configuration\npublic class ${name}Config {\n${beanMethods}\n}\n`;
}

function mybatisXml(namespace, stmts) {
  const stmtXml = stmts.map(s => `    <${s.type} id="${s.id}">\n        ${s.sql}\n    </${s.type}>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">\n<mapper namespace="${namespace}">\n${stmtXml}\n</mapper>\n`;
}

// ────────────────────────── MAIN ──────────────────────────

function main() {
  const start = Date.now();
  if (fs.existsSync(ROOT)) fs.rmSync(ROOT, { recursive: true });

  console.log('Generating e-commerce MSA fixture...');
  genConfigs(); console.log('  Configs: done');
  genStores(); console.log('  Stores: 6 files');
  genComposables(); console.log('  Composables: 7 files');
  genApiModules(); console.log('  API modules: 7 files');
  genRouter(); console.log('  Router: 1 file');
  genComponents(); console.log('  Components: ~50 files');
  genFrontendExtras(); console.log('  Types/directives/utils: 7 files');
  genBackend(); console.log('  Backend: 3 MSA services');

  let count = 0;
  function countFiles(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory()) countFiles(path.join(dir, e.name)); else count++; } }
  countFiles(ROOT);
  console.log(`\nDone! ${count} files in ${Date.now() - start}ms`);
}

main();
