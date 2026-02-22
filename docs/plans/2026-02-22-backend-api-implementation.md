# PetPals Backend API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete REST API backend for the PetPals e-commerce application using Express.js, PostgreSQL, and Prisma ORM with JWT authentication.

**Architecture:** Monolithic Express server with PostgreSQL database. RESTful API with JWT-based authentication, role-based access control (customer/admin), and Prisma ORM for type-safe database operations.

**Tech Stack:** Node.js 20+, Express 4.x, PostgreSQL 16+, Prisma 5.x, TypeScript 5, JWT, bcrypt, Zod validation, Jest testing

---

## Task 1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`

**Step 1: Create package.json**

Create `backend/package.json`:

```json
{
  "name": "petpals-backend",
  "version": "1.0.0",
  "description": "PetPals e-commerce backend API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.2",
    "jest": "^29.7.0",
    "prisma": "^5.22.0",
    "ts-jest": "^29.2.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Step 2: Create tsconfig.json**

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*", "prisma/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .env.example**

Create `backend/.env.example`:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/petpals?schema=public"

# JWT
JWT_SECRET="change-this-to-a-secure-random-string-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:3000"
```

**Step 4: Create .gitignore**

Create `backend/.gitignore`:

```
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
```

**Step 5: Commit**

```bash
cd backend
git add .
cd ..
git add backend/
git commit -m "feat: initialize backend project with configuration"
```

---

## Task 2: Set Up Prisma and Database Schema

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/config/database.ts`

**Step 1: Initialize Prisma**

Run: `cd backend && npx prisma init`
Expected: Creates `prisma/schema.prisma` and updates `.env`

**Step 2: Write Prisma schema**

Create `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]

  @@map("users")
}

model Product {
  id           String   @id @default(uuid())
  name         String
  slug         String   @unique
  description  String?
  price        Decimal  @db.Decimal(10, 2)
  originalPrice Decimal? @db.Decimal(10, 2)
  image        String?
  category     Category
  pet          Pet
  rating       Decimal  @default(0) @db.Decimal(2, 1)
  reviewCount  Int      @default(0)
  isNew        Boolean  @default(false)
  discount     Int?
  featured     Boolean  @default(false)
  stock        Int      @default(0)
  tags         String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  orderItems   OrderItem[]

  @@map("products")
}

model Order {
  id               String      @id @default(uuid())
  userId           String
  total            Decimal     @db.Decimal(10, 2)
  status           OrderStatus @default(PENDING)
  paymentMethod    String?
  shippingStreet   String?
  shippingCity     String?
  shippingState    String?
  shippingZipCode  String?
  shippingCountry  String?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  items            OrderItem[]

  @@map("orders")
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  price     Decimal  @db.Decimal(10, 2)
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id])

  @@map("order_items")
}

enum Role {
  CUSTOMER
  ADMIN
}

enum Category {
  FOOD
  TOYS
  SUPPLEMENTS
}

enum Pet {
  CAT
  DOG
  BOTH
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

**Step 3: Create database configuration**

Create `backend/src/config/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export default prisma

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
```

**Step 4: Commit**

```bash
git add backend/prisma/ backend/src/config/
git commit -m "feat: set up Prisma with database schema"
```

---

## Task 3: Create Type Definitions

**Files:**
- Create: `backend/src/types/index.ts`

**Step 1: Write shared type definitions**

Create `backend/src/types/index.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add backend/src/types/
git commit -m "feat: add shared type definitions"
```

---

## Task 4: Create Validation Schemas with Zod

**Files:**
- Create: `backend/src/validation/index.ts`

**Step 1: Write validation schemas**

Create `backend/src/validation/index.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add backend/src/validation/
git commit -m "feat: add Zod validation schemas"
```

---

## Task 5: Create Utility Functions

**Files:**
- Create: `backend/src/utils/jwt.ts`
- Create: `backend/src/utils/errors.ts`
- Create: `backend/src/config/index.ts`

**Step 1: Create JWT utilities**

Create `backend/src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken'
import { JWTPayload, Role } from '../types'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
```

**Step 2: Create custom error classes**

Create `backend/src/utils/errors.ts`:

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

export class ValidationError extends AppError {
  constructor(details: any) {
    super('Validation failed', 422, 'VALIDATION_ERROR')
    ;(this as any).details = details
  }
}
```

**Step 3: Create configuration file**

Create `backend/src/config/index.ts`:

```typescript
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: requireEnv('DATABASE_URL')
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
}
```

**Step 4: Commit**

```bash
git add backend/src/utils/ backend/src/config/
git commit -m "feat: add JWT utilities, error classes, and config"
```

---

## Task 6: Create Middleware

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/validation.ts`
- Create: `backend/src/middleware/error.ts`

**Step 1: Create authentication middleware**

Create `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractTokenFromHeader } from '../utils/jwt'
import { UnauthorizedError, ForbiddenError } from '../utils/errors'
import { AuthRequest, Role } from '../types'

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization)

  if (!token) {
    throw new UnauthorizedError('No token provided')
  }

  try {
    const payload = verifyToken(token)
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    }
    next()
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }

    next()
  }
}
```

**Step 2: Create validation middleware**

Create `backend/src/middleware/validation.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, ZodError } from 'zod'
import { ValidationError } from '../utils/errors'

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error.errors)
      }
      next(error)
    }
  }
}

export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error.errors)
      }
      next(error)
    }
  }
}
```

**Step 3: Create error handling middleware**

Create `backend/src/middleware/error.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError, ValidationError } from '../utils/errors'
import { ApiResponse } from '../types'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err)

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code
      }
    }

    if (err instanceof ValidationError && (err as any).details) {
      response.error!.details = (err as any).details
    }

    return res.status(err.statusCode).json(response)
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors
      }
    })
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  })
}
```

**Step 4: Commit**

```bash
git add backend/src/middleware/
git commit -m "feat: add authentication, validation, and error middleware"
```

---

## Task 7: Create Auth Controller

**Files:**
- Create: `backend/src/controllers/auth.ts`

**Step 1: Write auth controller**

Create `backend/src/controllers/auth.ts`:

```typescript
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../config/database'
import { generateToken } from '../utils/jwt'
import { AuthRequest } from '../types'
import { NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors'
import { registerSchema, loginSchema } from '../validation'

export async function register(req: Request, res: Response) {
  const { email, password, name } = registerSchema.parse(req.body)

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new ConflictError('Email already registered')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name
    }
  })

  res.status(201).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  })
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const isValidPassword = await bcrypt.compare(password, user.password)
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  })

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  })
}

export async function getProfile(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  })

  if (!user) {
    throw new NotFoundError('User')
  }

  res.json({
    success: true,
    data: user
  })
}
```

**Step 2: Commit**

```bash
git add backend/src/controllers/auth.ts
git commit -m "feat: add auth controller with register, login, and profile"
```

---

## Task 8: Create Product Controller

**Files:**
- Create: `backend/src/controllers/products.ts`

**Step 1: Write products controller**

Create `backend/src/controllers/products.ts`:

```typescript
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../types'
import { NotFoundError } from '../utils/errors'
import { createProductSchema, updateProductSchema } from '../validation'
import { Prisma } from '@prisma/client'

export async function getProducts(req: Request, res: Response) {
  const { category, pet, search, minPrice, maxPrice, sort } = req.query

  const where: Prisma.ProductWhereInput = {}

  if (category) {
    where.category = category.toString().toUpperCase()
  }

  if (pet) {
    where.pet = pet.toString().toUpperCase()
  }

  if (search) {
    where.OR = [
      { name: { contains: search.toString(), mode: 'insensitive' } },
      { description: { contains: search.toString(), mode: 'insensitive' } }
    ]
  }

  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) where.price.gte = parseFloat(minPrice.toString())
    if (maxPrice) where.price.lte = parseFloat(maxPrice.toString())
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }

  if (sort === 'price_asc') orderBy = { price: 'asc' }
  if (sort === 'price_desc') orderBy = { price: 'desc' }
  if (sort === 'rating') orderBy = { rating: 'desc' }

  const products = await prisma.product.findMany({
    where,
    orderBy
  })

  res.json({
    success: true,
    data: products
  })
}

export async function getProduct(req: Request, res: Response) {
  const { id } = req.params

  const product = await prisma.product.findUnique({
    where: { id }
  })

  if (!product) {
    throw new NotFoundError('Product')
  }

  res.json({
    success: true,
    data: product
  })
}

export async function createProduct(req: Request, res: Response) {
  const data = createProductSchema.parse(req.body)

  const product = await prisma.product.create({
    data
  })

  res.status(201).json({
    success: true,
    data: product
  })
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params
  const data = updateProductSchema.parse(req.body)

  const product = await prisma.product.update({
    where: { id },
    data
  })

  res.json({
    success: true,
    data: product
  })
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params

  await prisma.product.delete({
    where: { id }
  })

  res.status(204).send()
}
```

**Step 2: Commit**

```bash
git add backend/src/controllers/products.ts
git commit -m "feat: add products controller with CRUD operations"
```

---

## Task 9: Create Order Controller

**Files:**
- Create: `backend/src/controllers/orders.ts`

**Step 1: Write orders controller**

Create `backend/src/controllers/orders.ts`:

```typescript
import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest, Role } from '../types'
import { NotFoundError, UnauthorizedError, ConflictError } from '../utils/errors'
import { createOrderSchema } from '../validation'

export async function createOrder(req: AuthRequest, res: Response) {
  const { items, shippingAddress, paymentMethod } = createOrderSchema.parse(req.body)

  // Fetch products and calculate total
  const productIds = items.map(item => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  })

  if (products.length !== items.length) {
    throw new NotFoundError('One or more products')
  }

  // Check stock and calculate total
  let total = 0
  const orderItems: { productId: string; quantity: number; price: number }[] = []

  for (const item of items) {
    const product = products.find(p => p.id === item.productId)!
    if (product.stock < item.quantity) {
      throw new ConflictError(`Insufficient stock for ${product.name}`)
    }
    const price = Number(product.price)
    total += price * item.quantity
    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price
    })
  }

  // Create order with transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId: req.user!.userId,
        total,
        paymentMethod,
        shippingStreet: shippingAddress.street,
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state,
        shippingZipCode: shippingAddress.zipCode,
        shippingCountry: shippingAddress.country,
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Update product stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      })
    }

    return newOrder
  })

  res.status(201).json({
    success: true,
    data: order
  })
}

export async function getOrders(req: AuthRequest, res: Response) {
  const orders = await prisma.order.findMany({
    where: {
      userId: req.user!.userId
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  res.json({
    success: true,
    data: orders
  })
}

export async function getOrder(req: AuthRequest, res: Response) {
  const { id } = req.params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!order) {
    throw new NotFoundError('Order')
  }

  // Customers can only see their own orders
  if (req.user!.role === Role.CUSTOMER && order.userId !== req.user!.userId) {
    throw new UnauthorizedError('Access to this order is forbidden')
  }

  res.json({
    success: true,
    data: order
  })
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  res.json({
    success: true,
    data: order
  })
}
```

**Step 2: Commit**

```bash
git add backend/src/controllers/orders.ts
git commit -m "feat: add orders controller with create, list, and status update"
```

---

## Task 10: Create Routes

**Files:**
- Create: `backend/src/routes/index.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/routes/products.ts`
- Create: `backend/src/routes/orders.ts`

**Step 1: Write auth routes**

Create `backend/src/routes/auth.ts`:

```typescript
import { Router } from 'express'
import { register, login, getProfile } from '../controllers/auth'
import { authenticate } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { registerSchema, loginSchema } from '../validation'

const router = Router()

router.post('/register', validateBody(registerSchema), register)
router.post('/login', validateBody(loginSchema), login)
router.get('/me', authenticate, getProfile)

export default router
```

**Step 2: Write products routes**

Create `backend/src/routes/products.ts`:

```typescript
import { Router } from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/products'
import { authenticate, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { createProductSchema, updateProductSchema } from '../validation'
import { Role } from '../types'

const router = Router()

router.get('/', getProducts)
router.get('/:id', getProduct)
router.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(createProductSchema),
  createProduct
)
router.put(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(updateProductSchema),
  updateProduct
)
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  deleteProduct
)

export default router
```

**Step 3: Write orders routes**

Create `backend/src/routes/orders.ts`:

```typescript
import { Router } from 'express'
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus
} from '../controllers/orders'
import { authenticate, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { createOrderSchema } from '../validation'
import { Role } from '../types'

const router = Router()

router.post(
  '/',
  authenticate,
  validateBody(createOrderSchema),
  createOrder
)
router.get('/', authenticate, getOrders)
router.get('/:id', authenticate, getOrder)
router.patch(
  '/:id/status',
  authenticate,
  requireRole(Role.ADMIN),
  updateOrderStatus
)

export default router
```

**Step 4: Write main routes file**

Create `backend/src/routes/index.ts`:

```typescript
import { Router } from 'express'
import authRoutes from './auth'
import productRoutes from './products'
import orderRoutes from './orders'

const router = Router()

router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/orders', orderRoutes)

export default router
```

**Step 5: Commit**

```bash
git add backend/src/routes/
git commit -m "feat: add route definitions for auth, products, and orders"
```

---

## Task 11: Create Express Server

**Files:**
- Create: `backend/src/server.ts`

**Step 1: Write server entry point**

Create `backend/src/server.ts`:

```typescript
import express from 'express'
import cors from 'cors'
import { config } from './config'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error'

const app = express()

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api', routes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)
})
```

**Step 2: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: create Express server with middleware and routes"
```

---

## Task 12: Create Database Seed Script

**Files:**
- Create: `backend/prisma/seed.ts`

**Step 1: Write seed script**

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient, Category, Pet, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const adminPassword = await import('bcrypt').then(b => b.hash('admin123', 10))

  const admin = await prisma.user.upsert({
    where: { email: 'admin@petpals.com' },
    update: {},
    create: {
      email: 'admin@petpals.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN
    }
  })

  console.log('Created admin user:', admin.email)

  // Create customer user
  const customerPassword = await import('bcrypt').then(b => b.hash('customer123', 10))

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      name: 'Test Customer',
      role: Role.CUSTOMER
    }
  })

  console.log('Created customer user:', customer.email)

  // Create products
  const products = [
    {
      name: 'Premium Dry Cat Food',
      slug: 'premium-dry-cat-food',
      description: 'High-quality dry food for adult cats with balanced nutrition.',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119',
      category: Category.FOOD,
      pet: Pet.CAT,
      rating: 4.5,
      reviewCount: 128,
      featured: true,
      stock: 50,
      tags: ['food', 'nutrition', 'adult cats']
    },
    {
      name: 'Interactive Cat Toy',
      slug: 'interactive-cat-toy',
      description: 'Engaging toy that stimulates your cat\'s hunting instincts.',
      price: 12.99,
      originalPrice: 16.99,
      image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13',
      category: Category.TOYS,
      pet: Pet.CAT,
      rating: 4.8,
      reviewCount: 95,
      isNew: true,
      discount: 20,
      featured: true,
      stock: 35,
      tags: ['toys', 'interactive', 'entertainment']
    },
    {
      name: 'Premium Dog Kibble',
      slug: 'premium-dog-kibble',
      description: 'Complete and balanced nutrition for adult dogs.',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1743269489028-2c7e359423e3',
      category: Category.FOOD,
      pet: Pet.DOG,
      rating: 4.7,
      reviewCount: 203,
      featured: true,
      stock: 45,
      tags: ['food', 'nutrition', 'adult dogs']
    },
    {
      name: 'Durable Dog Chew Toy',
      slug: 'durable-dog-chew-toy',
      description: 'Long-lasting chew toy designed for aggressive chewers.',
      price: 18.99,
      originalPrice: 22.99,
      image: 'https://images.unsplash.com/photo-1575425186775-b8de9a427e67',
      category: Category.TOYS,
      pet: Pet.DOG,
      rating: 4.6,
      reviewCount: 167,
      discount: 15,
      featured: true,
      stock: 30,
      tags: ['toys', 'durable', 'chew']
    },
    {
      name: 'Cat Immune Support Supplements',
      slug: 'cat-immune-support-supplements',
      description: 'Daily supplements to boost your cat\'s immune system.',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee',
      category: Category.SUPPLEMENTS,
      pet: Pet.CAT,
      rating: 4.3,
      reviewCount: 78,
      isNew: true,
      featured: true,
      stock: 25,
      tags: ['supplements', 'health', 'immune system']
    },
    {
      name: 'Dog Joint Health Supplements',
      slug: 'dog-joint-health-supplements',
      description: 'Support your dog\'s joint health and mobility.',
      price: 32.99,
      image: 'https://images.unsplash.com/photo-1582798358481-d199fb7347bb',
      category: Category.SUPPLEMENTS,
      pet: Pet.DOG,
      rating: 4.5,
      reviewCount: 112,
      featured: true,
      stock: 40,
      tags: ['supplements', 'joint health', 'mobility']
    }
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product
    })
  }

  console.log(`Created ${products.length} products`)
  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 2: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat: add database seed script with sample data"
```

---

## Task 13: Set Up Testing Infrastructure

**Files:**
- Create: `backend/jest.config.js`
- Create: `backend/tests/setup.ts`
- Create: `backend/tests/auth.test.ts`
- Create: `backend/tests/products.test.ts`
- Create: `backend/tests/orders.test.ts`

**Step 1: Create Jest configuration**

Create `backend/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}
```

**Step 2: Create test setup file**

Create `backend/tests/setup.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

afterEach(async () => {
  // Clean up database after each test
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
```

**Step 3: Write auth tests**

Create `backend/tests/auth.test.ts`:

```typescript
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../src/routes/auth'
import { errorHandler, notFoundHandler } from '../src/middleware/error'
import { prisma } from './setup'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.email).toBe('test@example.com')
    })

    it('should return 409 for duplicate email', async () => {
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: 'hashedpassword',
          name: 'Existing User'
        }
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        })

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
    })

    it('should return 422 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        })

      expect(response.status).toBe(422)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const bcrypt = await import('bcrypt')
      const hashedPassword = await bcrypt.hash('password123', 10)

      await prisma.user.create({
        data: {
          email: 'login@example.com',
          password: hashedPassword,
          name: 'Login User'
        }
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('token')
      expect(response.body.data.user).toHaveProperty('email', 'login@example.com')
    })

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
    })
  })
})
```

**Step 4: Write products tests**

Create `backend/tests/products.test.ts`:

```typescript
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import productRoutes from '../src/routes/products'
import { errorHandler, notFoundHandler } from '../src/middleware/error'
import { prisma } from './setup'
import { generateToken } from '../src/utils/jwt'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/products', productRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

describe('Product Endpoints', () => {
  let adminToken: string
  let productId: string

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: 'hashedpassword',
        name: 'Admin',
        role: 'ADMIN'
      }
    })

    adminToken = generateToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role
    })
  })

  describe('GET /api/products', () => {
    it('should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/products')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should filter by category', async () => {
      await prisma.product.create({
        data: {
          name: 'Cat Food',
          slug: 'cat-food',
          category: 'FOOD',
          pet: 'CAT',
          price: 20,
          stock: 10
        }
      })

      const response = await request(app)
        .get('/api/products?category=food')

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/products', () => {
    it('should create product with admin token', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          slug: 'test-product',
          price: 29.99,
          category: 'TOYS',
          pet: 'DOG',
          stock: 50
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('Test Product')
      productId = response.body.data.id
    })

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: 'Another Product',
          slug: 'another-product',
          price: 19.99,
          category: 'FOOD',
          pet: 'CAT',
          stock: 20
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/products/:id', () => {
    it('should return product by id', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)

      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(productId)
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id')

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/products/:id', () => {
    it('should update product with admin token', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product'
        })

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Updated Product')
    })
  })

  describe('DELETE /api/products/:id', () => {
    it('should delete product with admin token', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(204)
    })
  })
})
```

**Step 5: Write orders tests**

Create `backend/tests/orders.test.ts`:

```typescript
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import orderRoutes from '../src/routes/orders'
import { errorHandler, notFoundHandler } from '../src/middleware/error'
import { prisma } from './setup'
import { generateToken } from '../src/utils/jwt'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/orders', orderRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

describe('Order Endpoints', () => {
  let userToken: string
  let adminToken: string
  let productId: string
  let orderId: string

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: 'customer@test.com',
        password: 'hashedpassword',
        name: 'Customer',
        role: 'CUSTOMER'
      }
    })

    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: 'hashedpassword',
        name: 'Admin',
        role: 'ADMIN'
      }
    })

    userToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    adminToken = generateToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role
    })

    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
        price: 29.99,
        category: 'TOYS',
        pet: 'DOG',
        stock: 100
      }
    })

    productId = product.id
  })

  describe('POST /api/orders', () => {
    it('should create order with valid token', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId,
              quantity: 2
            }
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          paymentMethod: 'credit_card'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.total).toBe(59.98)
      orderId = response.body.data.id
    })

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId, quantity: 1 }],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          paymentMethod: 'credit_card'
        })

      expect(response.status).toBe(401)
    })

    it('should return 409 for insufficient stock', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId,
              quantity: 200
            }
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          paymentMethod: 'credit_card'
        })

      expect(response.status).toBe(409)
    })
  })

  describe('GET /api/orders', () => {
    it('should return user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should return order by id', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(orderId)
    })

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(404)
    })
  })
})
```

**Step 6: Commit**

```bash
git add backend/jest.config.js backend/tests/
git commit -m "test: add test infrastructure and API tests"
```

---

## Task 14: Install Dependencies and Test

**Step 1: Install dependencies**

Run: `cd backend && npm install`

**Step 2: Generate Prisma Client**

Run: `cd backend && npx prisma generate`

**Step 3: Create .env file**

Run: `cd backend && cp .env.example .env`

Then edit `.env` with your PostgreSQL credentials.

**Step 4: Run database migration**

Run: `cd backend && npx prisma migrate dev --name init`

**Step 5: Seed database**

Run: `cd backend && npx prisma db seed`

**Step 6: Run tests**

Run: `cd backend && npm test`

**Step 7: Commit**

```bash
git add backend/
git commit -m "chore: install dependencies and setup complete"
```

---

## Task 15: Create README Documentation

**Files:**
- Create: `backend/README.md`

**Step 1: Write README**

Create `backend/README.md`:

```markdown
# PetPals Backend API

REST API backend for the PetPals e-commerce application.

## Tech Stack

- Node.js 20+
- Express 4.x
- PostgreSQL 16+
- Prisma ORM
- TypeScript
- JWT Authentication

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

3. Generate Prisma Client:
```bash
npx prisma generate
```

4. Run migrations:
```bash
npx prisma migrate dev
```

5. Seed database (optional):
```bash
npx prisma db seed
```

### Development

```bash
npm run dev
```

Server runs on http://localhost:5000

### Testing

```bash
npm test
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Products

- `GET /api/products` - List all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (admin only)

## Test Credentials

After seeding:

**Admin:**
- Email: admin@petpals.com
- Password: admin123

**Customer:**
- Email: customer@example.com
- Password: customer123
```

**Step 2: Commit**

```bash
git add backend/README.md
git commit -m "docs: add backend README"
```

---

## Implementation Complete

All tasks completed. The backend API is now fully implemented with:

✅ Project initialized with TypeScript and Express
✅ Prisma ORM configured with PostgreSQL
✅ Complete database schema (users, products, orders, order_items)
✅ JWT authentication with bcrypt password hashing
✅ Role-based access control (customer/admin)
✅ Full CRUD operations for products
✅ Order creation with stock management
✅ Zod validation on all inputs
✅ Comprehensive error handling
✅ Test suite with Jest
✅ Database seeding script
✅ Complete documentation

**Next Steps for Frontend Integration:**

1. Update frontend to call backend API endpoints
2. Replace localStorage cart with API orders
3. Replace mock products with API calls
4. Implement JWT token storage and refresh
5. Update checkout flow to use real order creation

---

## Notes

- Default admin credentials: `admin@petpals.com` / `admin123`
- Default customer credentials: `customer@example.com` / `customer123`
- JWT tokens expire after 7 days
- All prices stored in cents as Decimal type
- Images are stored as URLs (consider using S3 or Cloudinary in production)
