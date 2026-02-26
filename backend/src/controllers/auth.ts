import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import prisma from '../config/database'
import { generateToken } from '../utils/jwt'
import { AuthRequest } from '../types'
import { NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from '../utils/errors'
import { registerSchema, loginSchema } from '../validation'

export async function register(req: Request, res: Response) {
  const { email, password, name } = registerSchema.parse(req.body)

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new ConflictError('Email already registered')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name
    }
  })

  res.status(201).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  })
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const isValidPassword = await bcrypt.compare(password, user.password)
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  })

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  })
}

export async function getProfile(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  })

  if (!user) {
    throw new NotFoundError('User')
  }

  res.json({
    success: true,
    data: user
  })
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body

  if (!email) {
    throw new BadRequestError('Email is required')
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent email enumeration
  if (user) {
    // Generate a simple reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    
    // Create a simple encoded token (in production, use JWT or proper token storage)
    const encodedToken = Buffer.from(`${user.id}:${resetToken}`).toString('base64')

    // In production, send email with reset link
    // For development, log the token
    console.log(`Password reset token for ${email}: ${encodedToken}`)
    console.log(`Reset link: http://localhost:3002/reset-password?token=${encodeURIComponent(encodedToken)}`)
  }

  // Always return success
  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent'
  })
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    throw new BadRequestError('Token and new password are required')
  }

  if (newPassword.length < 6) {
    throw new BadRequestError('Password must be at least 6 characters')
  }

  try {
    // Decode the token
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [userId, resetToken] = decoded.split(':')

    if (!userId || !resetToken) {
      throw new BadRequestError('Invalid token format')
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token')
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword
      }
    })

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    })
  } catch (error) {
    throw new BadRequestError('Invalid or expired reset token')
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const { name } = req.body

  if (!name || typeof name !== 'string') {
    throw new BadRequestError('Name is required')
  }

  if (name.trim().length < 1) {
    throw new BadRequestError('Name cannot be empty')
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name: name.trim() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  })

  res.json({
    success: true,
    data: user
  })
}
