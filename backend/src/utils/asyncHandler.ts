import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Wrapper for async route handlers to catch errors and pass them to Express
 * This prevents unhandled promise rejections from crashing the server
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default asyncHandler
