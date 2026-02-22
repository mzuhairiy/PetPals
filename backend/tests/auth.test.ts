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
