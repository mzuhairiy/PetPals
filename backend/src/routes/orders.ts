import { Router } from 'express'
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  getDashboardStats
} from '../controllers/orders'
import { authenticate, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { createOrderSchema } from '../validation'
import { Role } from '../types'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.post(
  '/',
  authenticate,
  validateBody(createOrderSchema),
  asyncHandler(createOrder)
)
router.get('/', authenticate, asyncHandler(getOrders))
router.get('/all', authenticate, requireRole(Role.ADMIN), asyncHandler(getAllOrders))
router.get('/stats', authenticate, requireRole(Role.ADMIN), asyncHandler(getDashboardStats))
router.get('/:id', authenticate, asyncHandler(getOrder))
router.patch(
  '/:id/status',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(updateOrderStatus)
)

export default router
