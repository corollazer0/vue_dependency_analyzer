export interface UserResponse {
  id: number
  username: string
  email: string
  displayName: string
  role: string
  avatarUrl: string
  isActive: boolean
  // missing: lastLoginIp (exists in backend)
}

export interface ProductResponse {
  id: number
  title: string
  description: string
  price: number
  stock: number
  categoryId: number
  images: string[]
  rating: number
  reviewCount: number
  // missing: internalSku (exists in backend)
}

export interface OrderResponse {
  id: number
  userId: number
  items: OrderItemResponse[]
  totalAmount: number
  status: string
  shippingAddress: string
  trackingNumber: string
  createdAt: string
  paidAt: string
  frontendNote: string // NOT in backend
}

export interface OrderItemResponse {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
}

export interface DashboardStatsResponse {
  totalOrders: number
  totalRevenue: number
  totalUsers: number
  totalProducts: number
  conversionRate: number
}

export interface CategoryResponse {
  id: number
  name: string
  parentId: number | null
  children: CategoryResponse[]
}
