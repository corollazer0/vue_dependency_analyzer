export interface UserDto {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  isActive: boolean;
}

export interface ProductDto {
  id: number;
  title: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  stockQuantity: number;
  rating: number;
}

export interface OrderDto {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  trackingNumber: string;
  createdAt: string;
}

export interface CartDto {
  id: number;
  userId: number;
  items: CartItemDto[];
  totalPrice: number;
  itemCount: number;
  updatedAt: string;
}

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  iconUrl: string;
  sortOrder: number;
}

export interface ReviewDto {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulCount: number;
}

export interface CouponDto {
  id: number;
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface InventoryDto {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  reservedQuantity: number;
  lastRestockedAt: string;
}

export interface WishlistDto {
  id: number;
  userId: number;
  productId: number;
  addedAt: string;
  priority: number;
}

export interface PaymentDto {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  transactionId: string;
  paidAt: string;
}

export interface CartItemDto {
  id: number;
  productId: number;
  productTitle: string;
  quantity: number;
  unitPrice: number;
}
