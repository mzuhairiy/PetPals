import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractTokenFromHeader } from '../utils/jwt'
import { UnauthorizedError, ForbiddenError } from '../utils/errors'
import { AuthRequest, Role } from '../types'

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization)

  if (!token) {
    throw new UnauthorizedError('No token provided')
  }

  try {
    const payload = verifyToken(token)
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    }
    next()
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }

    next()
  }
}
