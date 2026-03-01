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

const router = Router()

router.post(
  '/',
  authenticate,
  validateBody(createOrderSchema),
  createOrder
)
router.get('/', authenticate, getOrders)
router.get('/all', authenticate, requireRole(Role.ADMIN), getAllOrders)
router.get('/stats', authenticate, requireRole(Role.ADMIN), getDashboardStats)
router.get('/:id', authenticate, getOrder)
router.patch(
  '/:id/status',
  authenticate,
  requireRole(Role.ADMIN),
  updateOrderStatus
)

export default router
