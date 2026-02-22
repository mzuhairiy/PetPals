import { z } from 'zod'
import { Category, Pet } from '@prisma/client'

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(5).max(255),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100)
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password is required')
})

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  originalPrice: z.number().positive().optional(),
  image: z.string().url('Image must be a valid URL').optional(),
  category: z.enum(['FOOD', 'TOYS', 'SUPPLEMENTS']),
  pet: z.enum(['CAT', 'DOG', 'BOTH']),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  tags: z.array(z.string()).optional(),
  isNew: z.boolean().optional(),
  discount: z.number().int().min(0).max(100).optional(),
  featured: z.boolean().optional()
})

export const updateProductSchema = createProductSchema.partial()

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1')
  })).min(1, 'Order must have at least one item'),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required')
  }),
  paymentMethod: z.string().min(1, 'Payment method is required')
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
