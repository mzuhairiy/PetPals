import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest, Role } from '../types'
import { NotFoundError, UnauthorizedError, ConflictError } from '../utils/errors'
import { createOrderSchema } from '../validation'

export async function createOrder(req: AuthRequest, res: Response) {
  const { items, shippingAddress, paymentMethod } = createOrderSchema.parse(req.body)

  // Fetch products and calculate total
  const productIds = items.map(item => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  })

  if (products.length !== items.length) {
    throw new NotFoundError('One or more products')
  }

  // Check stock and calculate total
  let total = 0
  const orderItems: { productId: string; quantity: number; price: number }[] = []

  for (const item of items) {
    const product = products.find(p => p.id === item.productId)!
    if (product.stock < item.quantity) {
      throw new ConflictError(`Insufficient stock for ${product.name}`)
    }
    const price = Number(product.price)
    total += price * item.quantity
    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price
    })
  }

  // Create order with transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId: req.user!.userId,
        total,
        paymentMethod,
        shippingStreet: shippingAddress.street,
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state,
        shippingZipCode: shippingAddress.zipCode,
        shippingCountry: shippingAddress.country,
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
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
    data: order
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
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  res.json({
    success: true,
    data: orders
  })
}

export async function getOrder(req: AuthRequest, res: Response) {
  const { id } = req.params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true
        }
      }
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
    data: order
  })
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  res.json({
    success: true,
    data: order
  })
}
