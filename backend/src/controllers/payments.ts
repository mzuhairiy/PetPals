import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../types'
import { config } from '../config'

// Midtrans Snap - Create Transaction (get snap token)
export async function createSnapTransaction(req: AuthRequest, res: Response) {
  console.log("=== Snap endpoint hit ===")
  console.log("Order ID:", req.body.orderId)
  
  try {
    const { orderId } = req.body

    if (!orderId) {
      res.status(400).json({ success: false, error: { message: 'Order ID is required' } })
      return
    }

    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        user: true
      }
    })

    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found' } })
      return
    }

    if (order.payment.transactionId) {
    console.log("Snap token already exists, reusing:", order.payment.transactionId)

    return res.status(200).json({
      success: true,
      data: {
        snapToken: order.payment.transactionId,
        orderId: order.id,
        paymentId: order.payment.id
      }
    })
  }

    // Verify ownership
    if (order.userId !== req.user!.userId) {
      res.status(404).json({ success: false, error: { message: 'Order not found' } })
      return
    }

    // Check if order is pending
    if (order.status !== 'PENDING') {
      res.status(400).json({ success: false, error: { message: 'Order is not pending payment' } })
      return
    }

    // Check if payment already exists
    if (!order.payment) {
      res.status(400).json({ success: false, error: { message: 'Payment record not found' } })
      return
    }

    console.log("Order found, total:", order.total)

    // Prepare Midtrans transaction details
    const transactionDetails = {
      order_id: order.id,
      gross_amount: Number(order.total)
    }

    const itemDetails = order.items.map(item => ({
      id: item.productId,
      price: Number(item.price),
      quantity: item.quantity,
      name: item.nameSnapshot
    }))

    // Add shipping cost as item
    if (Number(order.shipping) > 0) {
      itemDetails.push({
        id: 'SHIPPING',
        price: Number(order.shipping),
        quantity: 1,
        name: 'Shipping Cost'
      })
    }

    // Add tax as item
    if (Number(order.tax) > 0) {
      itemDetails.push({
        id: 'TAX',
        price: Number(order.tax),
        quantity: 1,
        name: 'Tax'
      })
    }

    const customerDetails = {
      first_name: order.user.name.split(' ')[0] || 'Customer',
      last_name: order.user.name.split(' ').slice(1).join(' ') || '',
      email: order.user.email,
      phone: ''
    }

    console.log("Calling Midtrans Snap API...")
    console.log("URL:", `${config.midtrans.getBaseUrl()}/snap/v1/transactions`)

    // Call Midtrans Snap API (correct endpoint for Snap)
    const midtransUrl = `${config.midtrans.getBaseUrl()}/snap/v1/transactions`
    const authString = Buffer.from(config.midtrans.serverKey + ':').toString('base64')

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        transaction_details: transactionDetails,
        item_details: itemDetails,
        customer_details: customerDetails
      })
    })

    const midtransData = await midtransResponse.json()
    console.log("Midtrans response status:", midtransResponse.status)
    console.log("Midtrans response:", JSON.stringify(midtransData))

    if (midtransResponse.ok) {
      // Update payment record with snap token
      const updatedPayment = await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          provider: 'MIDTRANS_SNAP',
          transactionId: midtransData.token,
          rawResponse: midtransData,
          status: 'PENDING'
        }
      })

      // Return in format frontend expects
      res.status(200).json({
        success: true,
        data: {
          snapToken: midtransData.token,
          redirectUrl: midtransData.redirect_url,
          orderId: order.id,
          paymentId: updatedPayment.id
        }
      })
    } else {
      // Midtrans call failed
      console.error("Midtrans error:", midtransData)

      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          rawResponse: midtransData,
          status: 'FAILED'
        }
      })

      return res.status(midtransResponse.status).json({
        success: false,
        error: {
          message: midtransData.status_message || 'Failed to create payment token'
      }
    })
    }
  } catch (error: any) {
    console.error("=== Snap ERROR ===")
    console.error("Error:", error)
    console.error("Error message:", error.message)
    
    // Don't crash - respond with error
    res.status(500).json({ 
      success: false, 
      error: { message: error.message || 'Payment processing failed' } 
    })
  }
}

// Webhook - Midtrans notifies about payment status
export async function handleWebhook(req: Request, res: Response) {
  console.log("=== Webhook hit ===")
  console.log("Body:", JSON.stringify(req.body))

  // ALWAYS return 200 to acknowledge receipt - this is critical for Midtrans
  // Midtrans will retry if we return 4xx or 5xx

  try {
    const { order_id, transaction_status, payment_type, fraud_status } = req.body

    // Log the notification even if order_id is missing
    if (!order_id) {
      console.log("Webhook received but no order_id - acknowledging anyway")
      res.status(200).json({ success: true, message: 'Webhook acknowledged' })
      return
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { payment: true }
    })

    // If order not found, still acknowledge (but log warning)
    if (!order) {
      console.warn("Webhook: Order not found:", order_id)
      res.status(200).json({ success: true, message: 'Webhook acknowledged - order not found' })
      return
    }

    // Determine payment status
    let paymentStatus = 'PENDING'
    let orderStatus = 'PENDING'

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        paymentStatus = 'COMPLETED'
        orderStatus = 'PROCESSING'
      }
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'COMPLETED'
      orderStatus = 'PROCESSING'
    } else if (transaction_status === 'pending') {
      paymentStatus = 'PENDING'
      orderStatus = 'PENDING'
    } else if (transaction_status === 'deny') {
      paymentStatus = 'FAILED'
      orderStatus = 'CANCELLED'
    } else if (transaction_status === 'expire') {
      paymentStatus = 'EXPIRED'
      orderStatus = 'CANCELLED'
    } else if (transaction_status === 'cancel') {
      paymentStatus = 'CANCELLED'
      orderStatus = 'CANCELLED'
    }

    // Update payment
    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: paymentStatus,
          rawResponse: req.body,
          paymentType: payment_type
        }
      })
    }

    // Update order status
    await prisma.order.update({
      where: { id: order_id },
      data: { status: orderStatus as any }
    })

    console.log("Updated order:", order_id, "to status:", orderStatus)

    res.status(200).json({ success: true, message: 'Webhook processed' })
  } catch (error: any) {
    // Log error but STILL return 200 to prevent Midtrans retries
    console.error("Webhook error:", error)
    res.status(200).json({ success: true, message: 'Webhook acknowledged with error' })
  }
}

// Get payment status
export async function getPaymentStatus(req: AuthRequest, res: Response) {
  const { orderId } = req.params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true }
  })

  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  // Verify ownership
  if (order.userId !== req.user!.userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  res.json({
    success: true,
    data: {
      orderId: order.id,
      status: order.status,
      payment: order.payment
    }
  })
}
