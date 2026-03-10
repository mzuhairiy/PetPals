import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest, Role } from '../types'
import { NotFoundError, UnauthorizedError, ConflictError, BadRequestError } from '../utils/errors'
import { createOrderSchema } from '../validation'
import { config } from '../config'
import OrderStatusService from '../services/orderStatusService'

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

// Admin: Get all orders from all users
export async function getAllOrders(req: AuthRequest, res: Response) {
  const { status, page = '1', limit = '20' } = req.query

  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  if (status) {
    where.status = status.toString()
  }

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        },
        payment: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum
    }),
    prisma.order.count({ where })
  ])

  const transformedOrders = orders.map(order => ({
    id: order.id,
    createdAt: order.createdAt,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    shipping: Number(order.shipping),
    total: Number(order.total),
    status: order.status,
    user: order.user,
    shippingStreet: order.shippingStreet,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingZipCode: order.shippingZipCode,
    shippingCountry: order.shippingCountry,
    // Shipment fields
    shipmentId: (order as any).shipmentId,
    trackingId: (order as any).trackingId,
    courier: (order as any).courier,
    courierService: (order as any).courierService,
    shippingStatus: (order as any).shippingStatus,
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

  const totalPages = Math.ceil(totalCount / limitNum)

  res.json({
    success: true,
    data: transformedOrders,
    metadata: {
      totalCount,
      currentPage: pageNum,
      totalPages,
      limit: limitNum
    }
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

  // Check if admin can edit this order's status
  const permission = await OrderStatusService.canAdminEditStatus(id as string)
  if (!permission.canEdit) {
    res.status(403).json({ error: permission.reason || 'Cannot edit status' })
    return
  }

  // Validate transition is allowed
  const currentOrder = await prisma.order.findUnique({
    where: { id: id as string },
    include: { items: true }
  })
  
  if (!currentOrder) {
    throw new NotFoundError('Order')
  }
  
  if (!OrderStatusService.isValidTransition(currentOrder.status as any, status)) {
    res.status(400).json({ error: 'Invalid status transition' })
    return
  }

  // If changing to CANCELLED, restore stock for all items
  if (status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
      // Restore stock for each item
      for (const item of currentOrder.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        })
      }

      // Update order status
      await tx.order.update({
        where: { id: id as string },
        data: { status }
      })
    })
  } else {
    // Just update status without stock changes
    await prisma.order.update({
      where: { id: id as string },
      data: { status }
    })
  }

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

  res.json({
    success: true,
    data: order
  })
}

// Admin: Get dashboard stats
export async function getDashboardStats(req: AuthRequest, res: Response) {
  // Get total orders count
  const totalOrders = await prisma.order.count()
  
  // Get total revenue
  const revenueAgg = await prisma.order.aggregate({
    _sum: {
      total: true
    }
  })
  const totalRevenue = Number(revenueAgg._sum.total || 0)
  
  // Get total products
  const totalProducts = await prisma.product.count()
  
  // Get low stock products count (stock <= 10)
  const lowStockProducts = await prisma.product.count({
    where: {
      stock: {
        lte: 10
      }
    }
  })
  
  // Get orders by status
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  })
  
  // Get recent orders (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const recentOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo
      }
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      status: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  // Get monthly orders for chart (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const monthlyOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    select: {
      total: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })
  
  // Group by month
  const monthlyData: { [key: string]: number } = {}
  monthlyOrders.forEach(order => {
    const monthKey = order.createdAt.toISOString().slice(0, 7) // YYYY-MM
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(order.total)
  })
  
  const monthlyChartData = Object.entries(monthlyData).map(([month, revenue]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    revenue
  }))
  
  // Get orders by day for last 7 days
  const dailyData: { [key: string]: number } = {}
  recentOrders.forEach(order => {
    const dayKey = order.createdAt.toISOString().slice(0, 10) // YYYY-MM-DD
    dailyData[dayKey] = (dailyData[dayKey] || 0) + 1
  })
  
  const dailyChartData = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayKey = date.toISOString().slice(0, 10)
    dailyChartData.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      orders: dailyData[dayKey] || 0
    })
  }
  
  res.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue,
      totalProducts,
      lowStockProducts,
      ordersByStatus: ordersByStatus.map(o => ({
        status: o.status,
        count: o._count.status
      })),
      recentOrders: recentOrders.slice(0, 5).map(o => ({
        id: o.id,
        total: Number(o.total),
        status: o.status,
        createdAt: o.createdAt
      })),
      monthlyChartData,
      dailyChartData
    }
  })
}
