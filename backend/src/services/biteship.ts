import { config } from '../config'
import prisma from '../config/database'

// Biteship order status types
export type BiteshipStatus =
  | 'pending'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'returned'
  | 'failed'

interface BiteshipAddress {
  name: string
  phone: string
  email?: string
  address: string
  city: string
  province: string
  postal_code: string
  country: string
}

interface BiteshipItem {
  name: string
  description?: string
  quantity: number
  weight: number // in grams
  height?: number // in cm
  width?: number // in cm
  length?: number // in cm
  value: number // declared value in IDR
}

interface CreateShipmentParams {
  orderId: string
  originAddress: BiteshipAddress
  destinationAddress: BiteshipAddress
  items: BiteshipItem[]
  courier: string
  courierService: string
}

interface BiteshipOrderResponse {
  id: string
  reference_id: string
  booking_tracking_number?: string
  tracking_number?: string
  courier_code: string
  courier_service_code: string
  status: string
  estimated_pickup?: string
  estimated_delivery?: string
  created_at: string
  updated_at: string
}

export class BiteshipService {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = config.biteship.getBaseUrl()
    this.apiKey = config.biteship.apiKey
  }

  /**
   * Create a shipment order in Biteship
   */
  async createShipment(params: CreateShipmentParams): Promise<BiteshipOrderResponse> {
    const { orderId, originAddress, destinationAddress, items, courier, courierService } = params

    console.log(`[Biteship] Creating shipment for order ${orderId}`)
    console.log(`[Biteship] Courier: ${courier} - ${courierService}`)

    const payload = {
      reference_id: orderId,
      // Shipper info (who is sending the package)
      shipper_contact_name: originAddress.name,
      shipper_contact_phone: originAddress.phone,
      shipper_contact_email: originAddress.email,
      shipper_organization: 'PetPals',
      // Origin address
      origin_contact_name: originAddress.name,
      origin_contact_phone: originAddress.phone,
      origin_address: originAddress.address,
      origin_postal_code: originAddress.postal_code,
      // Destination address
      destination_contact_name: destinationAddress.name,
      destination_contact_phone: destinationAddress.phone,
      destination_contact_email: destinationAddress.email,
      destination_address: destinationAddress.address,
      destination_postal_code: destinationAddress.postal_code,
      // Courier
      courier_company: courier,
      courier_type: courierService,
      // Delivery
      delivery_type: 'now',
      // Items
      items: items
    }

    const response = await fetch(`${this.baseUrl}/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Biteship] Failed to create shipment:', error)
      throw new Error(error.message || `Failed to create shipment: ${response.status}`)
    }

    const result = await response.json()
    console.log(`[Biteship] Shipment created successfully:`, result.id)

    return result
  }

  /**
   * Get shipment details from Biteship
   */
  async getShipment(shipmentId: string): Promise<BiteshipOrderResponse> {
    console.log(`[Biteship] Getting shipment ${shipmentId}`)

    const response = await fetch(`${this.baseUrl}/v1/orders/${shipmentId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to get shipment: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Cancel a shipment in Biteship
   */
  async cancelShipment(shipmentId: string): Promise<boolean> {
    console.log(`[Biteship] Cancelling shipment ${shipmentId}`)

    const response = await fetch(`${this.baseUrl}/v1/orders/${shipmentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Biteship] Failed to cancel shipment:', error)
      return false
    }

    console.log(`[Biteship] Shipment cancelled successfully`)
    return true
  }

  /**
   * Create shipment for an order after payment success
   */
  async createShipmentForOrder(orderId: string): Promise<boolean> {
    try {
      // Get order with items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          user: true
        }
      })

      if (!order) {
        console.error(`[Biteship] Order not found: ${orderId}`)
        return false
      }

      // Cast to any to access new fields
      const orderWithShipment = order as any

      // Check if shipment already exists
      if (orderWithShipment.shipmentId) {
        console.log(`[Biteship] Shipment already exists for order: ${orderId}`)
        return true
      }

      // Validate shipping address
      if (!order.shippingStreet || !order.shippingCity || !order.shippingZipCode) {
        console.error(`[Biteship] Missing shipping address for order: ${orderId}`)
        return false
      }

      // Prepare destination address
      const destinationAddress: BiteshipAddress = {
        name: order.user.name,
        phone: orderWithShipment.shippingPhone || '081234567890',
        email: orderWithShipment.shippingEmail || order.user.email,
        address: order.shippingStreet,
        city: order.shippingCity,
        province: order.shippingState || 'DKI Jakarta',
        postal_code: order.shippingZipCode,
        country: order.shippingCountry || 'ID'
      }

      // Prepare origin address (warehouse) - using a default for now
      const originAddress: BiteshipAddress = {
        name: 'PetPals Warehouse',
        phone: '0217654321',
        email: 'shipping@petpals.id',
        address: 'Jl. Warehouse No. 1',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postal_code: '12110',
        country: 'ID'
      }

      // Prepare items
      const items: BiteshipItem[] = order.items.map(item => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        weight: 500, // Default 500g per item - should be in product data
        value: item.price * item.quantity
      }))

      // Use default courier for now - could be made configurable
      const courier = 'jne' // Could be dynamic based on cheapest rate
      const courierService = 'reg'

      // Create shipment
      const shipment = await this.createShipment({
        orderId,
        originAddress,
        destinationAddress,
        items,
        courier,
        courierService
      })

      // Log full response for debugging
      console.log(`[Biteship] Full shipment response:`, JSON.stringify(shipment, null, 2))

      // Determine initial order status based on Biteship status
      // Biteship API v1 returns 'status' field
      const shipmentAny = shipment as any
      const initialShippingStatus = shipmentAny.status || shipmentAny.status_shipment || shipmentAny.order_status || 'CONFIRMED'
      console.log(`[Biteship] Initial shipment status: '${initialShippingStatus}'`)
      
      const { OrderStatusService } = await import('./orderStatusService')
      const initialOrderStatus = OrderStatusService.mapShippingToOrderStatus(initialShippingStatus)
      console.log(`[Biteship] Mapped to order status: ${initialOrderStatus}`)

      // Update order with shipment info and status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          shipmentId: shipment.id,
          trackingId: shipment.tracking_number || shipment.booking_tracking_number || null,
          courier: shipment.courier_code,
          courierService: shipment.courier_service_code,
          shippingStatus: shipment.status,
          shippingRawResponse: shipment,
          status: initialOrderStatus
        } as any
      })

      console.log(`[Biteship] Shipment created for order ${orderId}: ${shipment.id}`)
      return true
    } catch (error) {
      console.error(`[Biteship] Failed to create shipment for order ${orderId}:`, error)
      
      // Update order to mark shipment as failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          shippingStatus: 'failed'
        } as any
      }).catch(() => {})
      
      return false
    }
  }

  /**
   * Process webhook update from Biteship
   */
  async handleWebhook(payload: {
    order_id: string
    status: string
    tracking_number?: string
    courier_code?: string
    courier_service_code?: string
  }): Promise<boolean> {
    const { order_id, status, tracking_number, courier_code, courier_service_code } = payload

    console.log(`[Biteship] Webhook received for order ${order_id}, status: ${status}`)

    try {
      // Find order by shipment ID (Biteship order_id is stored as shipmentId)
      const order = await prisma.order.findFirst({
        where: { shipmentId: order_id }
      })

      if (!order) {
        console.warn(`[Biteship] Order not found for shipment: ${order_id}`)
        // Return true to acknowledge webhook even if order not found
        return true
      }

      // Map Biteship status to our status
      let shippingStatus = status
      let orderStatus = order.status

      // Update order status based on shipping status
      if (status === 'delivered') {
        orderStatus = 'DELIVERED'
      } else if (status === 'picked_up' || status === 'on_the_way') {
        orderStatus = 'SHIPPED'
      } else if (status === 'failed' || status === 'returned') {
        // as Keep PROCESSING but update shipping status
      }

      // Update order with shipping status
      const orderWithShipment = order as any
      await prisma.order.update({
        where: { id: order.id },
        data: {
          shippingStatus,
          status: orderStatus as any,
          trackingId: tracking_number || orderWithShipment.trackingId,
          courier: courier_code || orderWithShipment.courier,
          courierService: courier_service_code || orderWithShipment.courierService
        } as any
      })

      console.log(`[Biteship] Order ${order.id} shipping status updated to: ${status}`)
      return true
    } catch (error) {
      console.error(`[Biteship] Error processing webhook:`, error)
      return false
    }
  }

  /**
   * Retry shipment creation for a failed order
   */
  async retryShipment(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      console.error(`[Biteship] Order not found: ${orderId}`)
      return false
    }

    // Only retry if shipment previously failed
    const orderWithShipment = order as any
    if (orderWithShipment.shippingStatus !== 'failed' && orderWithShipment.shipmentId) {
      console.log(`[Biteship] Order ${orderId} already has a valid shipment`)
      return false
    }

    // Clear previous shipment data and retry
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shipmentId: null,
        trackingId: null,
        courier: null,
        courierService: null,
        shippingStatus: null,
        shippingRawResponse: null
      } as any
    })

    return this.createShipmentForOrder(orderId)
  }
}

// Export singleton instance
export const biteshipService = new BiteshipService()
