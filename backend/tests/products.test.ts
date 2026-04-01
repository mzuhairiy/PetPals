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
  let customerToken: string

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: 'prod-admin@test.com',
        password: 'hashedpassword',
        name: 'Admin',
        role: 'ADMIN'
      }
    })
    adminToken = generateToken({ userId: admin.id, email: admin.email, role: admin.role })

    const customer = await prisma.user.create({
      data: {
        email: 'prod-customer@test.com',
        password: 'hashedpassword',
        name: 'Customer',
        role: 'CUSTOMER'
      }
    })
    customerToken = generateToken({ userId: customer.id, email: customer.email, role: customer.role })
  })

  afterAll(async () => {
    await prisma.product.deleteMany()
    await prisma.user.deleteMany({ where: { email: { in: ['prod-admin@test.com', 'prod-customer@test.com'] } } })
  })

  afterEach(async () => {
    await prisma.product.deleteMany()
  })

  describe('GET /api/products', () => {
    it('should return empty array when no products', async () => {
      const response = await request(app).get('/api/products')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual([])
    })

    it('should return products', async () => {
      await prisma.product.create({
        data: { name: 'Cat Food', slug: 'cat-food', category: 'FOOD', pet: 'CAT', price: 399000, stock: 10 }
      })

      const response = await request(app).get('/api/products')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe('Cat Food')
    })

    it('should filter by category', async () => {
      await prisma.product.createMany({
        data: [
          { name: 'Cat Food', slug: 'cat-food', category: 'FOOD', pet: 'CAT', price: 399000, stock: 10 },
          { name: 'Dog Toy', slug: 'dog-toy', category: 'TOYS', pet: 'DOG', price: 199000, stock: 5 }
        ]
      })

      const response = await request(app).get('/api/products?category=food')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].category).toBe('FOOD')
    })
  })

  describe('POST /api/products', () => {
    it('should create product as admin', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Product',
          slug: 'new-product',
          price: 250000,
          category: 'TOYS',
          pet: 'DOG',
          stock: 50
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('New Product')
      expect(response.body.data.price).toBe(250000)
    })

    it('should reject without auth', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({ name: 'Product', slug: 'product', price: 100000, category: 'FOOD', pet: 'CAT', stock: 10 })

      expect(response.status).toBe(401)
    })

    it('should reject non-admin', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Product', slug: 'product', price: 100000, category: 'FOOD', pet: 'CAT', stock: 10 })

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/products/:id', () => {
    it('should return product by id', async () => {
      const product = await prisma.product.create({
        data: { name: 'Find Me', slug: 'find-me', category: 'FOOD', pet: 'CAT', price: 150000, stock: 5 }
      })

      const response = await request(app).get(`/api/products/${product.id}`)

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Find Me')
    })

    it('should return 404 for non-existent product', async () => {
      const response = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000')

      expect(response.status).toBe(404)
    })
  })
})
