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

const router = Router()

router.get('/', getProducts)
router.get('/price-range', getPriceRange)
router.get('/:id', getProduct)
router.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(createProductSchema),
  createProduct
)
router.put(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(updateProductSchema),
  updateProduct
)
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  deleteProduct
)

export default router
