import { Router } from 'express'
import { createSnapTransaction, handleWebhook, getPaymentStatus } from '../controllers/payments'
import { authenticate } from '../middleware/auth'

const router = Router()

// Create Snap transaction - generates snap token
router.post('/midtrans/snap', authenticate, createSnapTransaction)

// Webhook - Midtrans notifies about payment status
router.post('/midtrans/webhook', handleWebhook)

// Get payment status
router.get('/midtrans/status/:orderId', authenticate, getPaymentStatus)

export default router
