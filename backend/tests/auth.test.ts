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

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'Password1!', name: 'User' })

    const res = await request(app).post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'Password1!', name: 'User2' })

    expect(res.status).toBe(409)
  })

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'bad', password: 'Password1!', name: 'User' })

    expect(res.status).toBe(422)
  })

  it('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'short', name: 'User' })

    expect(res.status).toBe(422)
  })

  it('logs in with valid credentials', async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'Password1!', name: 'User' })

    const res = await request(app).post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'Password1!' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user.email).toBe('login@example.com')
  })

  it('rejects wrong password', async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'user@example.com', password: 'Password1!', name: 'User' })

    const res = await request(app).post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Wrong1!' })

    expect(res.status).toBe(401)
  })

  it('rejects non-existent user login', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1!' })

    expect(res.status).toBe(401)
  })
})
