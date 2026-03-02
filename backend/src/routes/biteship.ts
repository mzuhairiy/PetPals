import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { biteshipService } from '../services/biteship'
import { OrderStatusService } from '../services/orderStatusService'
import { Role, AuthRequest } from '../types'
import prisma from '../config/database'

const router = Router()

// Create shipment for an order (admin only, but can be triggered internally)
router.post('/create/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = String(req.params.orderId)
    
    // Check if user is admin
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Only admins can create shipments' })
    }
    
    const success = await biteshipService.createShipmentForOrder(orderId)
    
    if (success) {
      res.json({ success: true, message: 'Shipment created successfully' })
    } else {
      res.status(400).json({ success: false, error: 'Failed to create shipment' })
    }
  } catch (error: any) {
    console.error('Error creating shipment:', error)
    res.status(500).json({ error: error.message || 'Failed to create shipment' })
  }
})

// Retry shipment creation (admin only)
router.post('/retry/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = String(req.params.orderId)
    
    // Check if user is admin
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Only admins can retry shipments' })
    }
    
    const success = await biteshipService.retryShipment(orderId)
    
    if (success) {
      res.json({ success: true, message: 'Shipment retry successful' })
    } else {
      res.status(400).json({ success: false, error: 'Failed to retry shipment' })
    }
  } catch (error: any) {
    console.error('Error retrying shipment:', error)
    res.status(500).json({ error: error.message || 'Failed to retry shipment' })
  }
})

// Get shipment status
router.get('/status/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = String(req.params.orderId)
    
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    // Check ownership or admin
    if (order.userId !== req.user?.userId && req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    
    res.json({
      success: true,
      data: {
        shipmentId: (order as any).shipmentId,
        trackingId: (order as any).trackingId,
        courier: (order as any).courier,
        courierService: (order as any).courierService,
        shippingStatus: (order as any).shippingStatus
      }
    })
  } catch (error: any) {
    console.error('Error getting shipment status:', error)
    res.status(500).json({ error: error.message || 'Failed to get shipment status' })
  }
})

// Check if admin can edit order status (for admin panel)
router.get('/can-edit/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can check this
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Only admins can check this' })
    }
    
    const orderId = String(req.params.orderId)
    const result = await OrderStatusService.canAdminEditStatus(orderId)
    
    res.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Error checking edit permission:', error)
    res.status(500).json({ error: error.message || 'Failed to check permission' })
  }
})

// Webhook endpoint for Biteship (no auth required)
// This endpoint handles both validation pings and actual webhook events
router.post('/webhook', async (req: AuthRequest, res: Response) => {
  try {
    // Biteship sends a validation ping with no body or minimal body
    // Return OK immediately for validation
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('[Biteship] Validation ping received')
      return res.status(200).json({ ok: true })
    }
    
    const rawBody = JSON.stringify(req.body)
    const signature = req.headers['x-biteship-signature'] as string | undefined
    
    // Validate webhook signature
    if (!OrderStatusService.validateWebhookSignature(rawBody, signature)) {
      console.warn('[Biteship] Invalid webhook signature')
      return res.status(200).json({ ok: true }) // Still return 200 to avoid retries
    }
    
    const payload = req.body
    
    console.log('[Biteship] Webhook received:', rawBody)
    
    // Validate webhook payload
    if (!payload.order_id || !payload.status) {
      console.warn('[Biteship] Invalid webhook payload - missing required fields')
      return res.status(200).json({ ok: true })
    }
    
    // Extract shipping status from webhook
    const shippingStatus = payload.status
    const trackingNumber = payload.tracking_number
    const courierCode = payload.courier_code
    const courierServiceCode = payload.courier_service_code
    
    // Check for idempotency - if status hasn't changed, don't reprocess
    const order = await prisma.order.findFirst({
      where: { shipmentId: payload.order_id } as any
    })
    
    if (order) {
      const orderAny = order as any
      // If shipping status is the same, skip processing
      if (orderAny.shippingStatus === shippingStatus) {
        console.log(`[Biteship] Idempotent: Status unchanged (${shippingStatus})`)
        return res.status(200).json({ ok: true, message: 'Status unchanged' })
      }
    }
    
    // Use OrderStatusService to handle the status update
    const result = await OrderStatusService.handleShippingStatusUpdate(
      order?.id || payload.order_id,
      shippingStatus,
      {
        trackingId: trackingNumber,
        courier: courierCode,
        courierService: courierServiceCode
      }
    )
    
    // Always return 200 OK for Biteship webhooks
    res.status(200).json({ ok: true, result })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    // Still return 200 to prevent retries
    res.status(200).json({ ok: true })
  }
})

export default router
