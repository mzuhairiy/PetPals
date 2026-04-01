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
  let userId: string
  let productId: string

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: 'order-customer@test.com', password: 'hashedpassword', name: 'Customer', role: 'CUSTOMER' }
    })
    userId = user.id
    userToken = generateToken({ userId: user.id, email: user.email, role: user.role })

    const admin = await prisma.user.create({
      data: { email: 'order-admin@test.com', password: 'hashedpassword', name: 'Admin', role: 'ADMIN' }
    })
    adminToken = generateToken({ userId: admin.id, email: admin.email, role: admin.role })

    const product = await prisma.product.create({
      data: { name: 'Test Product', slug: 'order-test-product', price: 160000, category: 'TOYS', pet: 'DOG', stock: 100 }
    })
    productId = product.id
  })

  afterAll(async () => {
    await prisma.orderItem.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany({ where: { email: { in: ['order-customer@test.com', 'order-admin@test.com'] } } })
  })

  describe('POST /api/orders', () => {
    it('should create order with valid token', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ productId, quantity: 2 }],
          shippingAddress: {
            street: 'Jl. Test No. 1',
            city: 'Jakarta',
            state: 'DKI Jakarta',
            zipCode: '12345',
            country: 'ID'
          }
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('orderId')
      expect(response.body.data.subtotal).toBe(320000) // 160000 * 2
      expect(response.body.data.tax).toBeGreaterThan(0)
      expect(response.body.data.total).toBeGreaterThan(320000)
    })

    it('should reject without auth', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [{ productId, quantity: 1 }],
          shippingAddress: { street: 'St', city: 'City', state: 'State', zipCode: '12345', country: 'ID' }
        })

      expect(response.status).toBe(401)
    })

    it('should reject insufficient stock', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ productId, quantity: 9999 }],
          shippingAddress: { street: 'St', city: 'City', state: 'State', zipCode: '12345', country: 'ID' }
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
    })

    it('should reject without auth', async () => {
      const response = await request(app).get('/api/orders')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/orders/all (admin)', () => {
    it('should return all orders for admin', async () => {
      const response = await request(app)
        .get('/api/orders/all')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should reject non-admin', async () => {
      const response = await request(app)
        .get('/api/orders/all')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
    })
  })
})
