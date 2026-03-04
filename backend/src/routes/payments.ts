import { Router } from 'express'
import { createSnapTransaction, handleWebhook, getPaymentStatus } from '../controllers/payments'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Create Snap transaction - generates snap token
router.post('/midtrans/snap', authenticate, asyncHandler(createSnapTransaction))

// Webhook - Midtrans notifies about payment status
router.post('/midtrans/webhook', asyncHandler(handleWebhook))

// Get payment status
router.get('/midtrans/status/:orderId', authenticate, asyncHandler(getPaymentStatus))

export default router