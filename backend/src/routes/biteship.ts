import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { biteshipService } from '../services/biteship'
import OrderStatusService from '../services/orderStatusService'
import { Role, AuthRequest } from '../types'
import prisma from '../config/database'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// Create shipment for an order (admin only, but can be triggered internally)
router.post('/create/:orderId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
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
}))

// Retry shipment creation (admin only)
router.post('/retry/:orderId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
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
}))

// Get shipment status
router.get('/status/:orderId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
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
}))

// Sync shipment status from Biteship API (admin only)
// This can be used as fallback when webhooks don't work
router.post('/sync/:orderId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = String(req.params.orderId)
  
  // Check if user is admin
  if (req.user?.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Only admins can sync shipment status' })
  }
  
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  })
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }
  
  const shipmentId = (order as any).shipmentId
  if (!shipmentId) {
    return res.status(400).json({ error: 'Order has no shipment' })
  }
  
  // Fetch latest status from Biteship API
  try {
    const shipment = await biteshipService.getShipment(shipmentId)
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found in Biteship' })
    }
    
    // Extract status from Biteship response
    const shipmentAny = shipment as any
    const shippingStatus = shipmentAny.status || shipmentAny.status_shipment || shipmentAny.order_status || ''
    
    console.log('[Biteship sync] Fetched status from API:', shippingStatus)
    
    // Update order status
    const result = await OrderStatusService.handleShippingStatusUpdate(
      orderId,
      shippingStatus,
      {
        trackingId: shipment.tracking_number || shipment.booking_tracking_number || undefined,
        courier: shipment.courier_code || undefined,
        courierService: shipment.courier_service_code || undefined
      }
    )
    
    res.json({
      success: result.success,
      message: result.message,
      orderStatus: result.orderStatus,
      shippingStatus: shippingStatus
    })
  } catch (error) {
    console.error('[Biteship sync] Error:', error)
    res.status(500).json({ error: 'Failed to sync shipment status' })
  }
}))

// Check if admin can edit order status (for admin panel)
router.get('/can-edit/:orderId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  // Only admins can check this
  if (req.user?.role !== Role.ADMIN) {
    return res.status(403).json({ error: 'Only admins can check this' })
  }
  
  const orderId = String(req.params.orderId)
  const result = await OrderStatusService.canAdminEditStatus(orderId)
  
  res.json({ success: true, data: result })
}))

// Webhook endpoint for Biteship (no auth required)
// This endpoint handles both validation pings and actual webhook events
router.post('/webhook', asyncHandler(async (req: AuthRequest, res: Response) => {
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
  
  // Validate webhook payload - support different field names and nested structures
  const orderId = payload.order_id || payload.id || payload.shipment_id || payload.waybill_id || ''
  
  // Try to find status in various possible locations
  let shippingStatus = ''
  
  // Direct status fields
  if (payload.status) {
    if (typeof payload.status === 'string') {
      shippingStatus = payload.status
    } else if (typeof payload.status === 'object') {
      // Nested status object - Biteship might send { status: { code: 'delivered', ... } }
      shippingStatus = payload.status.code || payload.status.name || payload.status.label || payload.status.status || ''
    }
  }
  
  // Try other possible field names
  if (!shippingStatus) {
    shippingStatus = payload.order_status || payload.shipment_status || payload.delivery_status || payload.tracking_status || ''
  }
  
  // Extract other shipping info
  const trackingNumber = payload.tracking_number || payload.tracking || payload.waybill_id || 
                         (payload.tracking?.number) || (payload.waybill?.number) || ''
  const courierCode = payload.courier_code || payload.courier || 
                      (payload.courier?.code) || ''
  const courierServiceCode = payload.courier_service_code || payload.courier_service || payload.service_code || 
                              (payload.courier?.service) || ''
  
  console.log('[Biteship] Parsed shippingStatus:', shippingStatus, 'orderId:', orderId)
  
  if (!orderId || !shippingStatus) {
    return res.status(200).json({ ok: true })
  }
  
  // Check for idempotency - if status hasn't changed, don't reprocess
  const order = await prisma.order.findFirst({
    where: { shipmentId: orderId } as any
  })
  
  if (!order) {
    console.warn(`[Biteship] Order not found for shipment: ${orderId}`)
    return res.status(200).json({ ok: true, message: 'Order not found' })
  }
  
  const orderAny = order as any
  // If shipping status is the same, skip processing
  if (orderAny.shippingStatus === shippingStatus) {
    console.log(`[Biteship] Idempotent: Status unchanged (${shippingStatus})`)
    return res.status(200).json({ ok: true, message: 'Status unchanged' })
  }

  // Use OrderStatusService to handle the status update
  const result = await OrderStatusService.handleShippingStatusUpdate(
    order.id,
    shippingStatus,
    {
      trackingId: trackingNumber,
      courier: courierCode,
      courierService: courierServiceCode
    }
  )
  
  // Always return 200 OK for Biteship webhooks
  res.status(200).json({ ok: true, result })
}))

export default router
