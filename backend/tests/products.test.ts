import request from 'supertest'
import express from 'express'
import productRoutes from '../src/routes/products'
import { errorHandler, notFoundHandler } from '../src/middleware/error'
import { prisma } from './setup'
import { generateToken } from '../src/utils/jwt'

const app = express()
app.use(express.json())
app.use('/api/products', productRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

let adminToken: string

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { email: 'prod-admin@test.com', password: 'hash', name: 'Admin', role: 'ADMIN' }
  })
  adminToken = generateToken({ userId: admin.id, email: admin.email, role: admin.role })
})

afterEach(async () => {
  await prisma.orderItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'prod-admin@test.com' } })
})

describe('Products', () => {
  it('returns products list', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('creates and retrieves product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cat Food', slug: 'cat-food-test', category: 'FOOD', pet: 'CAT', price: 399000, stock: 10 })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Cat Food')

    const getRes = await request(app).get(`/api/products/${res.body.data.id}`)
    expect(getRes.status).toBe(200)
    expect(getRes.body.data.name).toBe('Cat Food')
  })

  it('filters by category', async () => {
    await prisma.product.createMany({
      data: [
        { name: 'Cat Food', slug: 'cat-food-filter', category: 'FOOD', pet: 'CAT', price: 399000, stock: 10 },
        { name: 'Dog Toy', slug: 'dog-toy-filter', category: 'TOYS', pet: 'DOG', price: 199000, stock: 5 }
      ]
    })

    const res = await request(app).get('/api/products?category=food')
    expect(res.status).toBe(200)
    expect(res.body.data.some((p: any) => p.category === 'FOOD')).toBe(true)
  })

  it('rejects create without auth', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'New', slug: 'new-prod', price: 250000, category: 'TOYS', pet: 'DOG', stock: 50 })

    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent product', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })
})
