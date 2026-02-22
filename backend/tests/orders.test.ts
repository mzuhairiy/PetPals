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
