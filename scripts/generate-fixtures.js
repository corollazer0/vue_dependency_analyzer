#!/usr/bin/env node
/**
 * generate-fixtures.js
 * Generates a realistic Vue 3 + Spring Boot test fixture project for VDA performance testing.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'test-project');
const FE = path.join(ROOT, 'frontend', 'src');
const BE = path.join(ROOT, 'backend', 'src', 'main', 'java', 'com', 'example');

// ── Helpers ──

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelCase(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ── Domain data ──

const DOMAINS = ['user', 'product', 'order', 'common', 'auth', 'dashboard'];

const COMPONENT_NAMES_BY_DOMAIN = {
  user: [
    'UserProfile', 'UserAvatar', 'UserList', 'UserCard', 'UserSettings',
    'UserBadge', 'UserForm', 'UserSearch', 'UserActivity', 'UserRoles',
    'UserPermissions', 'UserNotifications', 'UserPreferences', 'UserBio',
    'UserStats', 'UserOnboarding', 'UserDeletion', 'UserExport', 'UserImport',
    'UserMerge', 'UserTimeline', 'UserContacts', 'UserGroups', 'UserTags',
    'UserFilter', 'UserSort', 'UserPagination', 'UserTable', 'UserGrid',
    'UserModal', 'UserDrawer', 'UserTooltip', 'UserPopover', 'UserDropdown',
  ],
  product: [
    'ProductCard', 'ProductList', 'ProductDetail', 'ProductImage', 'ProductPrice',
    'ProductReview', 'ProductRating', 'ProductSearch', 'ProductFilter', 'ProductSort',
    'ProductCategory', 'ProductBrand', 'ProductVariant', 'ProductSku', 'ProductStock',
    'ProductGallery', 'ProductComparison', 'ProductWishlist', 'ProductQuickView',
    'ProductBadge', 'ProductTag', 'ProductCarousel', 'ProductGrid', 'ProductTable',
    'ProductForm', 'ProductUpload', 'ProductImport', 'ProductExport', 'ProductBulkEdit',
    'ProductAnalytics', 'ProductRecommendation', 'ProductBundle', 'ProductDiscount',
    'ProductInventory',
  ],
  order: [
    'OrderList', 'OrderDetail', 'OrderSummary', 'OrderItem', 'OrderStatus',
    'OrderTracking', 'OrderHistory', 'OrderRefund', 'OrderReturn', 'OrderInvoice',
    'OrderShipping', 'OrderPayment', 'OrderConfirmation', 'OrderCancel', 'OrderNotes',
    'OrderTimeline', 'OrderExport', 'OrderFilter', 'OrderSearch', 'OrderTable',
    'OrderStats', 'OrderChart', 'OrderBulkAction', 'OrderPrint', 'OrderEmail',
    'OrderNotification', 'OrderReview', 'OrderFeedback', 'OrderDispute', 'OrderLabel',
    'OrderReceipt', 'OrderPickup', 'OrderDelivery',
  ],
  common: [
    'AppHeader', 'AppFooter', 'AppSidebar', 'AppBreadcrumb', 'AppNavigation',
    'BaseButton', 'BaseInput', 'BaseSelect', 'BaseModal', 'BaseDrawer',
    'BaseTable', 'BaseCard', 'BasePagination', 'BaseToast', 'BaseAlert',
    'BaseSpinner', 'BaseSkeleton', 'BaseAvatar', 'BaseBadge', 'BaseChip',
    'BaseDropdown', 'BaseTooltip', 'BasePopover', 'BaseTabs', 'BaseAccordion',
    'IconWrapper', 'DataEmpty', 'DataError', 'LoadingOverlay', 'ConfirmDialog',
    'SearchBar', 'FilterPanel', 'SortSelect', 'DatePicker', 'FileUpload',
  ],
  auth: [
    'LoginForm', 'RegisterForm', 'ForgotPassword', 'ResetPassword', 'OtpInput',
    'SocialLogin', 'AuthGuard', 'PermissionGate', 'RoleGuard', 'SessionTimeout',
    'TwoFactorSetup', 'TwoFactorVerify', 'PasswordStrength', 'EmailVerify',
    'PhoneVerify', 'AuthCallback', 'LogoutConfirm', 'TokenRefresh', 'AuthError',
    'CaptchaWidget', 'BiometricAuth', 'SsoLogin', 'LdapLogin', 'ApiKeyManager',
    'OAuthConsent', 'DeviceList', 'TrustedDevices', 'SecurityLog', 'IpWhitelist',
    'RateLimitBanner', 'AccountLock', 'IdentityVerify', 'AuthHistory',
  ],
  dashboard: [
    'DashboardLayout', 'DashboardWidget', 'DashboardChart', 'DashboardStats',
    'DashboardTable', 'DashboardFilter', 'RevenueChart', 'SalesChart',
    'TrafficChart', 'ConversionChart', 'KpiCard', 'MetricCard', 'TrendIndicator',
    'ActivityFeed', 'RecentOrders', 'TopProducts', 'CustomerMap', 'HeatMap',
    'FunnelChart', 'PieChart', 'BarChart', 'LineChart', 'AreaChart',
    'RadarChart', 'GaugeChart', 'SparkLine', 'MiniChart', 'DataGrid',
    'ExportButton', 'RefreshButton', 'DateRangeSelector',
  ],
};

const COMPOSABLE_NAMES = [
  'useAuth', 'useUser', 'useCart', 'useProduct', 'useOrder',
  'useNotification', 'usePermission', 'useSearch', 'useFilter', 'usePagination',
  'useForm', 'useValidation', 'useDebounce', 'useThrottle', 'useLocalStorage',
  'useWebSocket', 'useInfiniteScroll', 'useBreakpoint', 'useTheme', 'useDarkMode',
  'useClipboard', 'useGeolocation', 'useMediaQuery', 'useEventBus', 'useToast',
  'useDragDrop', 'useKeyboard', 'useClickOutside', 'useFetch', 'useAsync',
];

const STORE_NAMES = [
  'useUserStore', 'useCartStore', 'useProductStore', 'useOrderStore', 'useAuthStore',
  'useNotificationStore', 'useSettingsStore', 'useUIStore', 'useCategoryStore',
  'useSearchStore', 'useWishlistStore', 'useReviewStore', 'useCouponStore',
  'useInventoryStore', 'useAnalyticsStore',
];

const VIEW_NAMES = [
  'HomeView', 'LoginView', 'RegisterView', 'DashboardView', 'ProfileView',
  'ProductListView', 'ProductDetailView', 'CartView', 'CheckoutView', 'OrderListView',
  'OrderDetailView', 'SettingsView', 'AdminView', 'NotFoundView', 'ForbiddenView',
];

const UTIL_MODULES = [
  'utils/formatDate', 'utils/formatCurrency', 'utils/validators', 'utils/helpers',
  'utils/constants', 'api/client', 'api/interceptors', 'api/endpoints',
  'services/analytics', 'services/logger', 'services/storage', 'services/i18n',
  'utils/debounce', 'utils/throttle', 'utils/deepClone', 'api/auth', 'api/products',
  'api/orders', 'api/users', 'services/eventBus',
];

const API_ENDPOINTS = [
  { method: 'get', path: '/api/users' },
  { method: 'get', path: '/api/users/:id' },
  { method: 'post', path: '/api/users' },
  { method: 'put', path: '/api/users/:id' },
  { method: 'delete', path: '/api/users/:id' },
  { method: 'get', path: '/api/products' },
  { method: 'get', path: '/api/products/:id' },
  { method: 'post', path: '/api/products' },
  { method: 'put', path: '/api/products/:id' },
  { method: 'delete', path: '/api/products/:id' },
  { method: 'get', path: '/api/products/:id/reviews' },
  { method: 'post', path: '/api/products/:id/reviews' },
  { method: 'get', path: '/api/orders' },
  { method: 'get', path: '/api/orders/:id' },
  { method: 'post', path: '/api/orders' },
  { method: 'put', path: '/api/orders/:id/status' },
  { method: 'post', path: '/api/orders/:id/cancel' },
  { method: 'get', path: '/api/cart' },
  { method: 'post', path: '/api/cart/items' },
  { method: 'delete', path: '/api/cart/items/:id' },
  { method: 'post', path: '/api/auth/login' },
  { method: 'post', path: '/api/auth/register' },
  { method: 'post', path: '/api/auth/logout' },
  { method: 'post', path: '/api/auth/refresh' },
  { method: 'get', path: '/api/categories' },
  { method: 'get', path: '/api/search' },
  { method: 'get', path: '/api/dashboard/stats' },
  { method: 'get', path: '/api/dashboard/revenue' },
  { method: 'get', path: '/api/notifications' },
  { method: 'put', path: '/api/notifications/:id/read' },
  { method: 'get', path: '/api/settings' },
  { method: 'put', path: '/api/settings' },
  { method: 'get', path: '/api/analytics/traffic' },
  { method: 'get', path: '/api/analytics/conversions' },
  { method: 'post', path: '/api/upload' },
  { method: 'get', path: '/api/inventory' },
  { method: 'put', path: '/api/inventory/:id' },
  { method: 'get', path: '/api/coupons' },
  { method: 'post', path: '/api/coupons/validate' },
  { method: 'get', path: '/api/reviews' },
  { method: 'get', path: '/api/wishlist' },
  { method: 'post', path: '/api/wishlist' },
  { method: 'delete', path: '/api/wishlist/:id' },
];

const INJECTION_KEYS = ['theme', 'locale', 'permissions', 'config', 'eventBus', 'logger'];

// ── All component names (flat list for cross-referencing) ──
const ALL_COMPONENTS = [];
for (const domain of DOMAINS) {
  for (const name of COMPONENT_NAMES_BY_DOMAIN[domain]) {
    ALL_COMPONENTS.push({ name, domain });
  }
}

// ── Generators ──

function generateVueComponent(name, domain, index) {
  // Pick 2-4 imports from other components, stores, composables
  const otherComponents = ALL_COMPONENTS
    .filter(c => c.name !== name)
    .map(c => c.name);
  const childComponents = pickN(otherComponents, 1 + (index % 3));
  const usedStores = pickN(STORE_NAMES, 1 + (index % 2));
  const usedComposables = pickN(COMPOSABLE_NAMES, 1 + (index % 2));
  const usedUtils = pickN(UTIL_MODULES, index % 2);
  const apiCalls = pickN(API_ENDPOINTS, 1 + (index % 2));

  const doProvide = index % 7 === 0;
  const doInject = index % 5 === 0 && !doProvide;
  const injectionKey = pick(INJECTION_KEYS);

  const props = pickN(['title', 'loading', 'disabled', 'items', 'modelValue', 'size', 'variant'], 2 + (index % 3));
  const emits = pickN(['update', 'close', 'submit', 'delete', 'select', 'change'], 1 + (index % 2));

  // Build import lines
  const imports = [];
  imports.push(`import { ref, computed, onMounted${doProvide ? ', provide' : ''}${doInject ? ', inject' : ''} } from 'vue'`);
  for (const store of usedStores) {
    imports.push(`import { ${store} } from '@/stores/${camelCase(store.replace('use', '').replace('Store', ''))}Store'`);
  }
  for (const comp of usedComposables) {
    imports.push(`import { ${comp} } from '@/composables/${comp}'`);
  }
  for (const util of usedUtils) {
    const moduleName = path.basename(util);
    imports.push(`import { ${moduleName} } from '@/${util}'`);
  }
  imports.push(`import axios from 'axios'`);

  // Build child component imports
  for (const child of childComponents) {
    const childDomain = ALL_COMPONENTS.find(c => c.name === child)?.domain || 'common';
    imports.push(`import ${child} from '@/components/${childDomain}/${child}.vue'`);
  }

  // Template with child components
  const childTags = childComponents.map(c => {
    const kebab = c.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    return `    <${kebab} />`;
  }).join('\n');

  const propsDecl = props.map(p => `  ${p}: { type: String, default: '' }`).join(',\n');
  const emitsDecl = emits.map(e => `'${e}'`).join(', ');

  const storeSetups = usedStores.map(s => {
    const varName = camelCase(s.replace('use', ''));
    return `  const ${varName} = ${s}()`;
  }).join('\n');

  const composableSetups = usedComposables.map(c => {
    const varName = camelCase(c.replace('use', ''));
    return `  const ${varName} = ${c}()`;
  }).join('\n');

  const apiCallsCode = apiCalls.map(api => {
    const urlStr = api.path.includes(':')
      ? `\`${api.path.replace(/:(\w+)/g, '${id}')}\``
      : `'${api.path}'`;
    return `    const response = await axios.${api.method}(${urlStr})`;
  }).join('\n');

  const provideCode = doProvide ? `  provide('${injectionKey}', ref('value'))` : '';
  const injectCode = doInject ? `  const ${injectionKey}Value = inject('${injectionKey}')` : '';

  return `<template>
  <div class="${domain}-${camelCase(name)}">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
${childTags}
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
${imports.join('\n')}

const props = defineProps({
${propsDecl}
})

const emit = defineEmits([${emitsDecl}])

${storeSetups}
${composableSetups}
${provideCode}
${injectCode}

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
${apiCallsCode}
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.${domain}-${camelCase(name)} {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
`;
}

function generateComposable(name, index) {
  const usedStores = pickN(STORE_NAMES, 1 + (index % 2));
  const apiCalls = pickN(API_ENDPOINTS, 1 + (index % 2));
  const otherComposables = COMPOSABLE_NAMES.filter(c => c !== name);
  const usedComposables = pickN(otherComposables, index % 2);

  const imports = [];
  imports.push(`import { ref, computed, watch } from 'vue'`);
  for (const store of usedStores) {
    imports.push(`import { ${store} } from '@/stores/${camelCase(store.replace('use', '').replace('Store', ''))}Store'`);
  }
  for (const comp of usedComposables) {
    imports.push(`import { ${comp} } from '@/composables/${comp}'`);
  }
  imports.push(`import axios from 'axios'`);

  const storeSetups = usedStores.map(s => {
    const varName = camelCase(s.replace('use', ''));
    return `  const ${varName} = ${s}()`;
  }).join('\n');

  const composableSetups = usedComposables.map(c => {
    const varName = camelCase(c.replace('use', ''));
    return `  const { ${varName} } = ${c}()`;
  }).join('\n');

  const apiCallsCode = apiCalls.map(api => {
    const urlStr = api.path.includes(':')
      ? `\`${api.path.replace(/:(\w+)/g, '${id}')}\``
      : `'${api.path}'`;
    return `    const response = await axios.${api.method}(${urlStr})
    return response.data`;
  }).join('\n');

  const funcName = capitalize(name.replace('use', ''));

  return `${imports.join('\n')}

export function ${name}() {
${storeSetups}
${composableSetups}

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetch${funcName}(id?: string) {
    loading.value = true
    error.value = null
    try {
${apiCallsCode}
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetch${funcName}, isEmpty }
}
`;
}

function generateStore(name, index) {
  const apiCalls = pickN(API_ENDPOINTS, 2 + (index % 3));
  const storeName = name.replace('use', '').replace('Store', '').toLowerCase();

  const apiActions = apiCalls.map((api, i) => {
    const urlStr = api.path.includes(':')
      ? `\`${api.path.replace(/:(\w+)/g, '${id}')}\``
      : `'${api.path}'`;
    const actionName = `action${i}`;
    return `  async function ${actionName}(id?: string) {
    loading.value = true
    try {
      const response = await axios.${api.method}(${urlStr})
      items.value = response.data
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }`;
  }).join('\n\n');

  const actionNames = apiCalls.map((_, i) => `action${i}`).join(', ');

  return `import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const ${name} = defineStore('${storeName}', () => {
  const items = ref<any[]>([])
  const selectedItem = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const count = computed(() => items.value.length)
  const hasError = computed(() => !!error.value)

${apiActions}

  function reset() {
    items.value = []
    selectedItem.value = null
    error.value = null
  }

  return { items, selectedItem, loading, error, count, hasError, ${actionNames}, reset }
})
`;
}

function generateUtilModule(modulePath, index) {
  const moduleName = path.basename(modulePath);
  if (modulePath.startsWith('api/')) {
    return generateApiModule(moduleName, index);
  }
  if (modulePath.startsWith('services/')) {
    return generateServiceModule(moduleName, index);
  }
  return generateUtilFile(moduleName, index);
}

function generateApiModule(name, index) {
  const apiCalls = pickN(API_ENDPOINTS, 3 + (index % 3));
  const funcs = apiCalls.map((api, i) => {
    const urlStr = api.path.includes(':')
      ? `\`${api.path.replace(/:(\w+)/g, '${id}')}\``
      : `'${api.path}'`;
    return `export async function ${name}Action${i}(id?: string, data?: any) {
  const response = await axios.${api.method}(${urlStr}${api.method !== 'get' ? ', data' : ''})
  return response.data
}`;
  }).join('\n\n');

  return `import axios from 'axios'

${funcs}
`;
}

function generateServiceModule(name, index) {
  return `import { ref } from 'vue'

class ${capitalize(name)}Service {
  private static instance: ${capitalize(name)}Service

  static getInstance(): ${capitalize(name)}Service {
    if (!${capitalize(name)}Service.instance) {
      ${capitalize(name)}Service.instance = new ${capitalize(name)}Service()
    }
    return ${capitalize(name)}Service.instance
  }

  log(message: string, level: string = 'info') {
    console.log(\`[\${level.toUpperCase()}] \${message}\`)
  }

  track(event: string, data?: Record<string, any>) {
    console.log('Track:', event, data)
  }
}

export const ${camelCase(name)}Service = ${capitalize(name)}Service.getInstance()
export default ${capitalize(name)}Service
`;
}

function generateUtilFile(name, index) {
  return `/**
 * ${name} utilities
 */

export function ${name}(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function ${name}Async(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(${name}(value)), 0)
  })
}

export const ${name.toUpperCase()}_DEFAULT = 'default'
`;
}

function generateView(name, index) {
  const domain = pick(DOMAINS);
  const childComponents = pickN(
    ALL_COMPONENTS.filter(c => c.domain === domain).map(c => c.name),
    2 + (index % 3)
  );
  const usedStores = pickN(STORE_NAMES, 1);
  const usedComposables = pickN(COMPOSABLE_NAMES, 1);
  const apiCalls = pickN(API_ENDPOINTS, 1);

  const imports = [];
  imports.push(`import { ref, onMounted } from 'vue'`);
  imports.push(`import { useRoute, useRouter } from 'vue-router'`);
  for (const store of usedStores) {
    imports.push(`import { ${store} } from '@/stores/${camelCase(store.replace('use', '').replace('Store', ''))}Store'`);
  }
  for (const comp of usedComposables) {
    imports.push(`import { ${comp} } from '@/composables/${comp}'`);
  }
  imports.push(`import axios from 'axios'`);
  for (const child of childComponents) {
    const childDomain = ALL_COMPONENTS.find(c => c.name === child)?.domain || 'common';
    imports.push(`import ${child} from '@/components/${childDomain}/${child}.vue'`);
  }

  const childTags = childComponents.map(c => {
    const kebab = c.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    return `    <${kebab} />`;
  }).join('\n');

  const storeSetup = usedStores.map(s => `  const ${camelCase(s.replace('use', ''))} = ${s}()`).join('\n');
  const composableSetup = usedComposables.map(c => `  const ${camelCase(c.replace('use', ''))} = ${c}()`).join('\n');

  const apiCallCode = apiCalls.map(api => {
    const urlStr = api.path.includes(':')
      ? `\`${api.path.replace(/:(\w+)/g, '${route.params.id}')}\``
      : `'${api.path}'`;
    return `    await axios.${api.method}(${urlStr})`;
  }).join('\n');

  return `<template>
  <div class="view-${camelCase(name)}">
    <h1>${name.replace('View', '')}</h1>
    <div class="view-content">
${childTags}
    </div>
  </div>
</template>

<script setup lang="ts">
${imports.join('\n')}

const route = useRoute()
const router = useRouter()
${storeSetup}
${composableSetup}

const pageData = ref(null)

onMounted(async () => {
  try {
${apiCallCode}
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-${camelCase(name)} {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
`;
}

// ── Java generators ──

const JAVA_DOMAINS = [
  'user', 'product', 'order', 'cart', 'auth', 'notification',
  'category', 'review', 'coupon', 'inventory', 'analytics',
  'search', 'settings', 'upload', 'dashboard', 'wishlist',
  'payment', 'shipping', 'report', 'admin',
];

const JAVA_ENDPOINT_TEMPLATES = {
  user: [
    { method: 'Get', path: '', ret: 'List<User>' },
    { method: 'Get', path: '/{id}', ret: 'User' },
    { method: 'Post', path: '', ret: 'User' },
    { method: 'Put', path: '/{id}', ret: 'User' },
    { method: 'Delete', path: '/{id}', ret: 'void' },
  ],
  product: [
    { method: 'Get', path: '', ret: 'List<Product>' },
    { method: 'Get', path: '/{id}', ret: 'Product' },
    { method: 'Post', path: '', ret: 'Product' },
    { method: 'Put', path: '/{id}', ret: 'Product' },
    { method: 'Delete', path: '/{id}', ret: 'void' },
    { method: 'Get', path: '/{id}/reviews', ret: 'List<Review>' },
    { method: 'Post', path: '/{id}/reviews', ret: 'Review' },
  ],
  order: [
    { method: 'Get', path: '', ret: 'List<Order>' },
    { method: 'Get', path: '/{id}', ret: 'Order' },
    { method: 'Post', path: '', ret: 'Order' },
    { method: 'Put', path: '/{id}/status', ret: 'Order' },
    { method: 'Post', path: '/{id}/cancel', ret: 'Order' },
  ],
  cart: [
    { method: 'Get', path: '', ret: 'Cart' },
    { method: 'Post', path: '/items', ret: 'Cart' },
    { method: 'Delete', path: '/items/{id}', ret: 'Cart' },
  ],
  auth: [
    { method: 'Post', path: '/login', ret: 'AuthResponse' },
    { method: 'Post', path: '/register', ret: 'AuthResponse' },
    { method: 'Post', path: '/logout', ret: 'void' },
    { method: 'Post', path: '/refresh', ret: 'AuthResponse' },
  ],
};

function generateController(domain, index) {
  const className = capitalize(domain) + 'Controller';
  const serviceName = capitalize(domain) + 'Service';
  const serviceVar = camelCase(serviceName);
  const basePath = `/api/${domain}${domain.endsWith('s') ? '' : 's'}`;
  // Fix some paths
  const fixedBasePath = {
    auth: '/api/auth',
    cart: '/api/cart',
    dashboard: '/api/dashboard',
    analytics: '/api/analytics',
    search: '/api/search',
    settings: '/api/settings',
    upload: '/api/upload',
    inventory: '/api/inventory',
  }[domain] || basePath;

  const endpoints = JAVA_ENDPOINT_TEMPLATES[domain] || [
    { method: 'Get', path: '', ret: `List<${capitalize(domain)}>` },
    { method: 'Get', path: '/{id}', ret: capitalize(domain) },
    { method: 'Post', path: '', ret: capitalize(domain) },
    { method: 'Put', path: '/{id}', ret: capitalize(domain) },
    { method: 'Delete', path: '/{id}', ret: 'void' },
  ];

  const endpointMethods = endpoints.map((ep, i) => {
    const methodName = `${ep.method.toLowerCase()}${capitalize(domain)}${i > 0 ? i : ''}`;
    const pathAnnotation = ep.path ? `@${ep.method}Mapping("${ep.path}")` : `@${ep.method}Mapping("")`;
    const params = ep.path.includes('{id}') ? '@PathVariable Long id' : '';
    const bodyParam = (ep.method === 'Post' || ep.method === 'Put')
      ? `${params ? ', ' : ''}@RequestBody ${capitalize(domain)}Request request`
      : '';

    return `    ${pathAnnotation}
    public ResponseEntity<${ep.ret}> ${methodName}(${params}${bodyParam}) {
        ${ep.ret === 'void'
          ? `${serviceVar}.${methodName}(${ep.path.includes('{id}') ? 'id' : ''});
        return ResponseEntity.noContent().build();`
          : `return ResponseEntity.ok(${serviceVar}.${methodName}(${ep.path.includes('{id}') ? 'id' : ''}));`
        }
    }`;
  }).join('\n\n');

  return `package com.example.controller;

import com.example.service.${serviceName};
import com.example.model.${capitalize(domain)};
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("${fixedBasePath}")
public class ${className} {

    private final ${serviceName} ${serviceVar};

    public ${className}(${serviceName} ${serviceVar}) {
        this.${serviceVar} = ${serviceVar};
    }

${endpointMethods}
}
`;
}

function generateService(domain, index) {
  const className = capitalize(domain) + 'Service';
  const repoName = capitalize(domain) + 'Repository';
  const repoVar = camelCase(repoName);
  // Some services depend on other services
  const otherDomains = JAVA_DOMAINS.filter(d => d !== domain);
  const depServices = pickN(otherDomains, index % 3).map(d => capitalize(d) + 'Service');

  const depFields = depServices.map(s =>
    `    private final ${s} ${camelCase(s)};`
  ).join('\n');

  const constructorParams = [
    `${repoName} ${repoVar}`,
    ...depServices.map(s => `${s} ${camelCase(s)}`)
  ].join(', ');

  const constructorAssignments = [
    `        this.${repoVar} = ${repoVar};`,
    ...depServices.map(s => `        this.${camelCase(s)} = ${camelCase(s)};`)
  ].join('\n');

  const depImports = depServices.map(s =>
    `import com.example.service.${s};`
  ).join('\n');

  return `package com.example.service;

import com.example.model.${capitalize(domain)};
import com.example.repository.${repoName};
${depImports}
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ${className} {

    private final ${repoName} ${repoVar};
${depFields}

    public ${className}(${constructorParams}) {
${constructorAssignments}
    }

    public List<${capitalize(domain)}> findAll() {
        return ${repoVar}.findAll();
    }

    public Optional<${capitalize(domain)}> findById(Long id) {
        return ${repoVar}.findById(id);
    }

    public ${capitalize(domain)} save(${capitalize(domain)} entity) {
        return ${repoVar}.save(entity);
    }

    public void deleteById(Long id) {
        ${repoVar}.deleteById(id);
    }
}
`;
}

function generateModel(domain) {
  const className = capitalize(domain);
  const fields = [
    'private Long id;',
    `private String name;`,
    `private String description;`,
    `private java.time.LocalDateTime createdAt;`,
    `private java.time.LocalDateTime updatedAt;`,
  ];

  return `package com.example.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "${domain}s")
public class ${className} {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    ${fields.join('\n    ')}

    public ${className}() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
`;
}

function generateRepository(domain) {
  const className = capitalize(domain) + 'Repository';
  const entityName = capitalize(domain);

  return `package com.example.repository;

import com.example.model.${entityName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ${className} extends JpaRepository<${entityName}, Long> {

    List<${entityName}> findByName(String name);
}
`;
}

function generateConfig(name) {
  return `package com.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class ${name}Config {

    @Bean
    public String ${camelCase(name)}Bean() {
        return "${name}";
    }
}
`;
}

// ── Main generation ──

function main() {
  const startTime = Date.now();
  let fileCount = 0;

  // Clean previous
  if (fs.existsSync(ROOT)) {
    fs.rmSync(ROOT, { recursive: true });
  }

  console.log('Generating test fixture project...');

  // ── Vue Components (200 across 6 domains) ──
  let compIndex = 0;
  for (const domain of DOMAINS) {
    const names = COMPONENT_NAMES_BY_DOMAIN[domain];
    // Take enough to sum to ~200
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const filePath = path.join(FE, 'components', domain, `${name}.vue`);
      writeFile(filePath, generateVueComponent(name, domain, compIndex));
      compIndex++;
      fileCount++;
    }
  }
  console.log(`  Components: ${compIndex} files`);

  // ── Composables (30) ──
  for (let i = 0; i < COMPOSABLE_NAMES.length; i++) {
    const name = COMPOSABLE_NAMES[i];
    const filePath = path.join(FE, 'composables', `${name}.ts`);
    writeFile(filePath, generateComposable(name, i));
    fileCount++;
  }
  console.log(`  Composables: ${COMPOSABLE_NAMES.length} files`);

  // ── Pinia Stores (15) ──
  for (let i = 0; i < STORE_NAMES.length; i++) {
    const name = STORE_NAMES[i];
    const storeName = camelCase(name.replace('use', '').replace('Store', '')) + 'Store';
    const filePath = path.join(FE, 'stores', `${storeName}.ts`);
    writeFile(filePath, generateStore(name, i));
    fileCount++;
  }
  console.log(`  Stores: ${STORE_NAMES.length} files`);

  // ── Util/API/Service modules (20) ──
  for (let i = 0; i < UTIL_MODULES.length; i++) {
    const mod = UTIL_MODULES[i];
    const filePath = path.join(FE, mod + '.ts');
    writeFile(filePath, generateUtilModule(mod, i));
    fileCount++;
  }
  console.log(`  Utils/API/Services: ${UTIL_MODULES.length} files`);

  // ── Views (15) ──
  for (let i = 0; i < VIEW_NAMES.length; i++) {
    const name = VIEW_NAMES[i];
    const filePath = path.join(FE, 'views', `${name}.vue`);
    writeFile(filePath, generateView(name, i));
    fileCount++;
  }
  console.log(`  Views: ${VIEW_NAMES.length} files`);

  // ── Extra .ts files (20) spread around ──
  const extraTsFiles = [
    'types/index', 'types/api', 'types/models', 'types/store',
    'router/index', 'router/guards', 'router/routes',
    'plugins/axios', 'plugins/pinia', 'plugins/i18n',
    'directives/clickOutside', 'directives/focus', 'directives/tooltip',
    'config/env', 'config/api', 'config/theme',
    'middleware/auth', 'middleware/logger',
    'lib/eventEmitter', 'lib/cacheManager',
  ];
  for (let i = 0; i < extraTsFiles.length; i++) {
    const mod = extraTsFiles[i];
    const filePath = path.join(FE, mod + '.ts');
    writeFile(filePath, generateUtilFile(path.basename(mod), i));
    fileCount++;
  }
  console.log(`  Extra TS: ${extraTsFiles.length} files`);

  const feTotal = fileCount;
  console.log(`  Frontend total: ${feTotal} files`);

  // ── Spring Boot ──

  // Controllers (20)
  for (let i = 0; i < JAVA_DOMAINS.length; i++) {
    const domain = JAVA_DOMAINS[i];
    const filePath = path.join(BE, 'controller', `${capitalize(domain)}Controller.java`);
    writeFile(filePath, generateController(domain, i));
    fileCount++;
  }
  console.log(`  Controllers: ${JAVA_DOMAINS.length} files`);

  // Services (20 + 10 extra = 30)
  for (let i = 0; i < JAVA_DOMAINS.length; i++) {
    const domain = JAVA_DOMAINS[i];
    const filePath = path.join(BE, 'service', `${capitalize(domain)}Service.java`);
    writeFile(filePath, generateService(domain, i));
    fileCount++;
  }
  // Extra services
  const extraServices = [
    'Email', 'Sms', 'Cache', 'Queue', 'Export',
    'Import', 'Scheduler', 'Audit', 'Validation', 'Encryption',
  ];
  for (let i = 0; i < extraServices.length; i++) {
    const name = extraServices[i];
    const filePath = path.join(BE, 'service', `${name}Service.java`);
    writeFile(filePath, generateService(name.toLowerCase(), JAVA_DOMAINS.length + i));
    fileCount++;
  }
  console.log(`  Services: ${JAVA_DOMAINS.length + extraServices.length} files`);

  // Models (20)
  for (const domain of JAVA_DOMAINS) {
    const filePath = path.join(BE, 'model', `${capitalize(domain)}.java`);
    writeFile(filePath, generateModel(domain));
    fileCount++;
  }
  console.log(`  Models: ${JAVA_DOMAINS.length} files`);

  // Repositories (20)
  for (const domain of JAVA_DOMAINS) {
    const filePath = path.join(BE, 'repository', `${capitalize(domain)}Repository.java`);
    writeFile(filePath, generateRepository(domain));
    fileCount++;
  }
  console.log(`  Repositories: ${JAVA_DOMAINS.length} files`);

  // Configs (remaining to reach ~200 total backend)
  const configs = [
    'Security', 'Web', 'Cors', 'Swagger', 'Cache',
    'Database', 'Redis', 'Kafka', 'S3', 'Jackson',
  ];
  for (const name of configs) {
    const filePath = path.join(BE, 'config', `${name}Config.java`);
    writeFile(filePath, generateConfig(name));
    fileCount++;
  }

  // DTO files to pad to ~200 backend files
  const dtoTypes = ['Request', 'Response', 'Dto', 'Summary', 'Detail'];
  const dtoCount = 200 - (JAVA_DOMAINS.length * 4 + extraServices.length + configs.length);
  for (let i = 0; i < Math.max(0, dtoCount); i++) {
    const domainIdx = Math.floor(i / dtoTypes.length) % JAVA_DOMAINS.length;
    const typeIdx = i % dtoTypes.length;
    const domain = JAVA_DOMAINS[domainIdx];
    const dtoType = dtoTypes[typeIdx];
    const filePath = path.join(BE, 'dto', `${capitalize(domain)}${dtoType}.java`);
    const content = `package com.example.dto;

public class ${capitalize(domain)}${dtoType} {
    private Long id;
    private String name;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
`;
    writeFile(filePath, content);
    fileCount++;
  }

  const beTotal = fileCount - feTotal;
  console.log(`  Backend total: ${beTotal} files`);

  // ── .vdarc.json ──
  const vdarc = {
    vueRoot: './frontend/src',
    springBootRoot: './backend/src/main/java',
    aliases: {
      '@': './frontend/src',
    },
    apiBaseUrl: '/api',
    include: ['**/*.vue', '**/*.ts', '**/*.java'],
    exclude: ['node_modules/**', 'dist/**', 'build/**'],
  };
  writeFile(path.join(ROOT, '.vdarc.json'), JSON.stringify(vdarc, null, 2));
  fileCount++;

  const elapsed = Date.now() - startTime;
  console.log(`\nDone! Generated ${fileCount} files in ${elapsed}ms`);
  console.log(`  Frontend: ${feTotal} files`);
  console.log(`  Backend: ${beTotal} files`);
  console.log(`  Config: 1 file`);
}

main();
