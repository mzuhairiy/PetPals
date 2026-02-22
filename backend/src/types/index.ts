import { Role, OrderStatus, Category, Pet } from '@prisma/client'

export type { Role, OrderStatus, Category, Pet }

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: Role
  }
}

export interface JWTPayload {
  userId: string
  email: string
  role: Role
  iat: number
  exp: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    details?: any
  }
}

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface CreateProductInput {
  name: string
  slug: string
  description?: string
  price: number
  originalPrice?: number
  image?: string
  category: Category
  pet: Pet
  stock: number
  tags?: string[]
  isNew?: boolean
  discount?: number
  featured?: boolean
}

export interface UpdateProductInput {
  name?: string
  slug?: string
  description?: string
  price?: number
  originalPrice?: number
  image?: string
  category?: Category
  pet?: Pet
  stock?: number
  tags?: string[]
  isNew?: boolean
  discount?: number
  featured?: boolean
  rating?: number
  reviewCount?: number
}

export interface CreateOrderInput {
  items: {
    productId: string
    quantity: number
  }[]
  shippingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  paymentMethod: string
}
