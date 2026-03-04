import { Router } from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPriceRange
} from '../controllers/products'
import { authenticate, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { createProductSchema, updateProductSchema } from '../validation'
import { Role } from '../types'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(getProducts))
router.get('/price-range', asyncHandler(getPriceRange))
router.get('/:id', asyncHandler(getProduct))
router.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(createProductSchema),
  asyncHandler(createProduct)
)
router.put(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(updateProductSchema),
  asyncHandler(updateProduct)
)
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(deleteProduct)
)

export default router
