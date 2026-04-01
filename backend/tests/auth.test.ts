import request from 'supertest'
import express from 'express'
import authRoutes from '../src/routes/auth'
import { errorHandler, notFoundHandler } from '../src/middleware/error'
import { prisma } from './setup'

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

afterEach(async () => {
  await prisma.user.deleteMany()
})

describe('Auth', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test User' })

    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe('test@example.com')
  })

  it('rejects duplicate email on same request', async () => {
    const email = 'dup@example.com'
    
    // First registration
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password1!', name: 'User1' })
    expect(res1.status).toBe(201)

    // Second registration with same email
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password1!', name: 'User2' })
    expect(res2.status).toBe(409)
  })

  it('logs in with valid credentials', async () => {
    const email = 'login@example.com'
    
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password1!', name: 'User' })

    // Then login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password1!' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
  })

  it('rejects wrong password', async () => {
    const email = 'user@example.com'
    
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password1!', name: 'User' })

    // Try login with wrong password
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Wrong1!' })

    expect(res.status).toBe(401)
  })

  it('rejects non-existent user login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1!' })

    expect(res.status).toBe(401)
  })
})
