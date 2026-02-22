import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError, ValidationError } from '../utils/errors'
import { ApiResponse } from '../types'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err)

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code
      }
    }

    if (err instanceof ValidationError && (err as any).details) {
      response.error!.details = (err as any).details
    }

    return res.status(err.statusCode).json(response)
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors
      }
    })
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  })
}
