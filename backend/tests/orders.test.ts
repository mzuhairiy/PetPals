import request from 'supertest'
import express from 'express'
import orderRoutes from '../src/routes/orders'
import { errorHandler, notFoundHandler } from '../src/middleware/error'
import { prisma } from './setup'
import { generateToken } from '../src/utils/jwt'

const app = express()
app.use(express.json())
app.use('/api/orders', orderRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

let userToken: string
let adminToken: string

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: 'order-customer@test.com', password: 'hash', name: 'Customer', role: 'CUSTOMER' }
  })
  userToken = generateToken({ userId: user.id, email: user.email, role: user.role })

  const admin = await prisma.user.create({
    data: { email: 'order-admin@test.com', password: 'hash', name: 'Admin', role: 'ADMIN' }
  })
  adminToken = generateToken({ userId: admin.id, email: admin.email, role: admin.role })
})

afterAll(async () => {
  await prisma.orderItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.user.deleteMany({ where: { email: { in: ['order-customer@test.com', 'order-admin@test.com'] } } })
})

describe('Orders', () => {
  it('returns user orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('rejects get orders without auth', async () => {
    const res = await request(app).get('/api/orders')
    expect(res.status).toBe(401)
  })

  it('returns all orders for admin', async () => {
    const res = await request(app)
      .get('/api/orders/all')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('rejects non-admin get all orders', async () => {
    const res = await request(app)
      .get('/api/orders/all')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(403)
  })
})
