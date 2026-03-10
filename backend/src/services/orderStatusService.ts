import { PrismaClient, OrderStatus } from '@prisma/client'
import { config } from '../config'
import prisma from '../config/database'

// Business order status type (extended from Prisma enum)
type BusinessOrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

class OrderStatusService {
  /**
   * Map shipping status from Biteship to business order status
   */
  static mapShippingToOrderStatus(shippingStatus: string): BusinessOrderStatus {
    // Handle both uppercase and lowercase
    const status = shippingStatus?.toUpperCase() || ''
    
    switch (status) {
      case 'PENDING':
      case 'CONFIRMED':
      case 'ALLOCATED':
      case 'CREATED':
        // Shipment has been created and confirmed - now waiting for pickup
        // This is when admin has created the shipment
        return 'SHIPPED'
      
      case 'PICKED_UP':
      case 'PICKUP':
        // Courier has picked up the package - also shipped
        return 'SHIPPED'
      
      case 'IN_TRANSIT':
      case 'TRANSIT':
      case 'ON_THE_WAY':
      case 'OUT_FOR_DELIVERY':
      case 'ONDELIVERY':
        // Still in transit - keep as SHIPPED
        return 'SHIPPED'
      
      case 'DELIVERED':
      case 'COMPLETED':
      case 'SUCCESS':
      case 'DONE':
        // Package delivered successfully
        return 'DELIVERED'
      
      case 'CANCELLED':
      case 'CANCELED':
      case 'VOID':
      case 'FAILED':
      case 'RETURNED':
      case 'RETURN':
        return 'CANCELLED'
      
      case 'FAILED_DELIVERY':
      case 'FAILED_DELIVERED':
        // Failed delivery attempt - still shipped, but may need attention
        return 'SHIPPED'
      
      default:
        // Default to SHIPPED for unknown shipping statuses (shipment was created)
        return 'SHIPPED'
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

      return { 
        success: true, 
        orderStatus: newOrderStatus,
        message: `Order status updated from ${currentStatus} to ${newOrderStatus}` 
      }
    } catch (error) {
      console.error(`[OrderStatusService] Error updating order status:`, error)
      return { 
        success: false, 
        message: `Error updating order status: ${error}` 
      }
    }
  }

  /**
   * Check if admin can edit order status
   */
  static async canAdminEditStatus(orderId: string): Promise<{ canEdit: boolean; currentStatus: string; message: string; reason?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return { canEdit: false, currentStatus: '', message: 'Order not found', reason: 'Order not found' }
    }

    const currentStatus = order.status as BusinessOrderStatus
    
    // Allow editing unless order is delivered or cancelled
    if (currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED') {
      return { 
        canEdit: false, 
        currentStatus: currentStatus, 
        message: `Cannot edit ${currentStatus.toLowerCase()} orders`,
        reason: `Cannot edit ${currentStatus.toLowerCase()} orders`
      }
    }

    return { 
      canEdit: true, 
      currentStatus: currentStatus, 
      message: 'Order status can be edited' 
    }
  }

  /**
   * Check if status transition is valid
   */
  static isValidTransition(currentStatus: BusinessOrderStatus, newStatus: BusinessOrderStatus): boolean {
    const validTransitions: Record<BusinessOrderStatus, BusinessOrderStatus[]> = {
      'PENDING': ['PROCESSING', 'CANCELLED'],
      'PROCESSING': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED', 'CANCELLED'],
      'DELIVERED': [],
      'CANCELLED': []
    }

    const allowed = validTransitions[currentStatus] || []
    return allowed.includes(newStatus)
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
