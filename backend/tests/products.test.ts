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
