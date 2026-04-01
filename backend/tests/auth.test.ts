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
  afterEach(async () => {
    await prisma.user.deleteMany()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password1!',
          name: 'Test User'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.email).toBe('test@example.com')
    })

    it('should return 409 for duplicate email', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password1!',
          name: 'Existing User'
        })

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password1!',
          name: 'Another User'
        })

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
    })

    it('should return 422 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password1!',
          name: 'Test User'
        })

      expect(response.status).toBe(422)
    })

    it('should return 422 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User'
        })

      expect(response.status).toBe(422)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password1!',
          name: 'Login User'
        })

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password1!'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('token')
      expect(response.body.data.user.email).toBe('login@example.com')
    })

    it('should return 401 for wrong password', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: 'Password1!',
          name: 'User'
        })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword1!'
        })

      expect(response.status).toBe(401)
    })

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'Password1!'
        })

      expect(response.status).toBe(401)
    })
  })
})
