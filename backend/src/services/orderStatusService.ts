import prisma from '../config/database'
import { OrderStatus } from '@prisma/client'

// Business order status values
export type BusinessOrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

// Biteship shipping status values
export type ShippingStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'ALLOCATED' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELLED'

// Valid admin-editable statuses (when no shipment exists)
const ALLOWED_ADMIN_STATUSES: BusinessOrderStatus[] = ['PROCESSING', 'CANCELLED']

// Status that should prevent backward transitions
const IRREVERSIBLE_STATUSES: BusinessOrderStatus[] = ['SHIPPED', 'DELIVERED', 'CANCELLED']

export class OrderStatusService {
  /**
   * Check if admin can manually change order status
   */
  static canAdminChangeStatus(orderId: string): boolean {
    // This is a sync check - for actual implementation, pass the order
    // We'll handle this in the controller
    return true
  }

  /**
   * Validate if status transition is allowed
   */
  static isValidTransition(currentStatus: BusinessOrderStatus, newStatus: BusinessOrderStatus): boolean {
    // Don't allow going backwards from irreversible statuses
    if (IRREVERSIBLE_STATUSES.includes(currentStatus)) {
      return false
    }
    
    // Allow specific transitions
    const validTransitions: Record<BusinessOrderStatus, BusinessOrderStatus[]> = {
      'PENDING': ['PROCESSING', 'CANCELLED'],
      'PROCESSING': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED'], // Only forward to delivered
      'DELIVERED': [], // Cannot change once delivered
      'CANCELLED': []  // Cannot change once cancelled
    }
    
    return validTransitions[currentStatus]?.includes(newStatus) ?? false
  }

  /**
   * Map shipping status from Biteship to business order status
   */
  static mapShippingToOrderStatus(shippingStatus: string): BusinessOrderStatus {
    switch (shippingStatus) {
      case 'PENDING':
      case 'CONFIRMED':
      case 'ALLOCATED':
        return 'PROCESSING'
      
      case 'PICKED_UP':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'SHIPPED'
      
      case 'DELIVERED':
        return 'DELIVERED'
      
      case 'CANCELLED':
        return 'CANCELLED'
      
      default:
        // Default to PROCESSING for unknown shipping statuses
        return 'PROCESSING'
    }
  }

  /**
   * Determine if shipping status should update business order status
   */
  static shouldUpdateOrderStatus(
    currentOrderStatus: BusinessOrderStatus, 
    shippingStatus: string,
    newOrderStatus: BusinessOrderStatus
  ): boolean {
    // If already delivered or cancelled, don't go backwards
    if (currentOrderStatus === 'DELIVERED' || currentOrderStatus === 'CANCELLED') {
      return false
    }

    // Only allow forward progression
    const statusOrder: BusinessOrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']
    const currentIndex = statusOrder.indexOf(currentOrderStatus)
    const newIndex = statusOrder.indexOf(newOrderStatus)
    
    return newIndex >= currentIndex
  }

  /**
   * Process shipping status update from webhook
   * Returns whether the update was applied
   */
  static async handleShippingStatusUpdate(
    orderId: string,
    shippingStatus: string,
    additionalData?: {
      trackingId?: string
      courier?: string
      courierService?: string
    }
  ): Promise<{ success: boolean; orderStatus?: string; message: string }> {
    console.log(`[OrderStatusService] Processing shipping status update for order ${orderId}: ${shippingStatus}`)

    try {
      // Get current order
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) {
        return { success: false, message: 'Order not found' }
      }

      const currentStatus = order.status as BusinessOrderStatus

      // Determine new order status based on shipping status
      const newOrderStatus = this.mapShippingToOrderStatus(shippingStatus)

      // Check if we should update
      if (!this.shouldUpdateOrderStatus(currentStatus, shippingStatus, newOrderStatus)) {
        console.log(`[OrderStatusService] Skipping status update: current=${currentStatus}, new would be=${newOrderStatus}`)
        return { 
          success: true, 
          orderStatus: currentStatus,
          message: 'Status update skipped - no backward progression allowed' 
        }
      }

      // Build update data
      const updateData: any = {
        shippingStatus: shippingStatus
      }

      // Add additional fields if provided
      if (additionalData?.trackingId) {
        updateData.trackingId = additionalData.trackingId
      }
      if (additionalData?.courier) {
        updateData.courier = additionalData.courier
      }
      if (additionalData?.courierService) {
        updateData.courierService = additionalData.courierService
      }

      // Update business order status
      updateData.status = newOrderStatus

      // Update order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData
      })

      console.log(`[OrderStatusService] Order ${orderId} status updated: ${currentStatus} -> ${newOrderStatus}`)

      return { 
        success: true, 
        orderStatus: newOrderStatus,
        message: 'Status updated successfully' 
      }
    } catch (error) {
      console.error('[OrderStatusService] Error updating status:', error)
      return { success: false, message: 'Failed to update status' }
    }
  }

  /**
   * Check if admin can edit status for an order
   */
  static async canAdminEditStatus(orderId: string): Promise<{
    canEdit: boolean
    reason?: string
    allowedStatuses?: BusinessOrderStatus[]
  }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return { canEdit: false, reason: 'Order not found' }
    }

    // If shipment exists, admin cannot edit
    const orderAny = order as any
    if (orderAny.shipmentId) {
      return { 
        canEdit: false, 
        reason: 'Shipment exists - status is managed automatically' 
      }
    }

    // If already delivered or cancelled, cannot edit
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return { 
        canEdit: false, 
        reason: `Order is ${order.status.toLowerCase()}` 
      }
    }

    return { 
      canEdit: true, 
      allowedStatuses: ALLOWED_ADMIN_STATUSES 
    }
  }

  /**
   * Validate webhook signature (basic implementation)
   * In production, use proper HMAC validation
   */
  static validateWebhookSignature(payload: string, signature: string | undefined): boolean {
    // For now, we'll do basic validation
    // In production, implement HMAC with BITESHIP_WEBHOOK_SECRET
    if (!signature) {
      console.warn('[OrderStatusService] No webhook signature provided')
      // For development, allow without signature
      return process.env.NODE_ENV !== 'production'
    }
    
    // TODO: Implement proper signature validation
    // const secret = config.biteship.webhookSecret
    // const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // return signature === expectedSignature
    
    return true
  }
}

export default OrderStatusService
