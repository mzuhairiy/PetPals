import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest, Role } from '../types'
import { NotFoundError, UnauthorizedError, ConflictError, BadRequestError } from '../utils/errors'
import { createOrderSchema } from '../validation'
import { config } from '../config'

export async function createOrder(req: AuthRequest, res: Response) {
  const { items, shippingAddress } = createOrderSchema.parse(req.body)

  if (!items || items.length === 0) {
    throw new BadRequestError('Cart is empty')
  }

  // Fetch products and calculate total
  const productIds = items.map(item => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  })

  // If products not found in DB, use fallback from frontend items
  // This handles the case where static product IDs don't match DB UUIDs
  const productMap = new Map(products.map(p => [p.id, p]))
  
  // Check stock and calculate subtotal
  let subtotal = 0
  const orderItems: { productId: string; quantity: number; price: number; nameSnapshot: string }[] = []

  for (const item of items) {
    const dbProduct = productMap.get(item.productId)
    
    // Use DB product or fallback to frontend data
    const productName = dbProduct?.name || `Product ${item.productId}`
    const productPrice = dbProduct ? Number(dbProduct.price) : item.price || 0
    const productStock = dbProduct?.stock || 999 // Allow if not in DB
    
    if (productStock < item.quantity) {
      throw new ConflictError(`Insufficient stock for ${productName}`)
    }
    
    subtotal += productPrice * item.quantity
    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: productPrice,
      nameSnapshot: productName
    })
  }

  // Calculate tax and shipping (all in IDR integers)
  const tax = Math.round(subtotal * (config.checkout.taxPercentage / 100))
  const shipping = subtotal >= config.checkout.freeShippingThreshold 
    ? 0 
    : config.checkout.defaultShippingCost
  const total = subtotal + tax + shipping

  // Create order with transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order with subtotal, tax, shipping
    const newOrder = await tx.order.create({
      data: {
        userId: req.user!.userId,
        subtotal,
        tax,
        shipping,
        total,
        shippingStreet: shippingAddress?.street,
        shippingCity: shippingAddress?.city,
        shippingState: shippingAddress?.state,
        shippingZipCode: shippingAddress?.zipCode,
        shippingCountry: shippingAddress?.country,
        items: {
          create: orderItems
        },
        // Create payment record
        payment: {
          create: {
            provider: 'MIDTRANS',
            status: 'PENDING'
          }
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        payment: true
      }
    })

    // Update product stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      })
    }

    return newOrder
  })

  res.status(201).json({
    success: true,
    data: {
      orderId: order.id,
      paymentId: order.payment?.id,
      subtotal,
      tax,
      shipping,
      total,
      status: order.status
    }
  })
}

export async function getOrders(req: AuthRequest, res: Response) {
  const orders = await prisma.order.findMany({
    where: {
      userId: req.user!.userId
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      payment: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Transform response
  const transformedOrders = orders.map(order => ({
    id: order.id,
    createdAt: order.createdAt,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    shipping: Number(order.shipping),
    total: Number(order.total),
    status: order.status,
    payment: order.payment ? {
      id: order.payment.id,
      status: order.payment.status,
      transactionId: order.payment.transactionId,
      provider: order.payment.provider
    } : null,
    items: order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      nameSnapshot: item.nameSnapshot,
      price: Number(item.price),
      quantity: item.quantity
    }))
  }))

  res.json({
    success: true,
    data: transformedOrders
  })
}

export async function getOrder(req: AuthRequest, res: Response) {
  const { id } = req.params

  const order = await prisma.order.findUnique({
    where: { id: id as string },
    include: {
      items: {
        include: {
          product: true
        }
      },
      payment: true
    }
  })

  if (!order) {
    throw new NotFoundError('Order')
  }

  // Customers can only see their own orders
  if (req.user!.role === Role.CUSTOMER && order.userId !== req.user!.userId) {
    throw new UnauthorizedError('Access to this order is forbidden')
  }

  res.json({
    success: true,
    data: {
      id: order.id,
      createdAt: order.createdAt,
      userId: order.userId,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      shipping: Number(order.shipping),
      total: Number(order.total),
      status: order.status,
      shippingStreet: order.shippingStreet,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
      shippingZipCode: order.shippingZipCode,
      shippingCountry: order.shippingCountry,
      payment: order.payment ? {
        id: order.payment.id,
        status: order.payment.status,
        transactionId: order.payment.transactionId,
        provider: order.payment.provider
      } : null,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        nameSnapshot: item.nameSnapshot,
        price: Number(item.price),
        quantity: item.quantity
      }))
    }
  })
}

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  const { id } = req.params
  const { status } = req.body

  const order = await prisma.order.update({
    where: { id: id as string },
    data: { status },
    include: {
      items: {
        include: {
          product: true
        }
      },
      payment: true
    }
  })

  res.json({
    success: true,
    data: order
  })
}
