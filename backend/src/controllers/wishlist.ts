import { Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../types'
import { NotFoundError, ConflictError } from '../utils/errors'

export async function getWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.userId

  const wishlist = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  res.json({
    success: true,
    data: wishlist
  })
}

export async function addToWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.userId
  const { productId } = req.body

  if (!productId) {
    throw new NotFoundError('Product ID is required')
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    throw new NotFoundError('Product')
  }

  // Check if already in wishlist
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })

  if (existing) {
    throw new ConflictError('Product already in wishlist')
  }

  const wishlistItem = await prisma.wishlist.create({
    data: {
      userId,
      productId
    },
    include: {
      product: true
    }
  })

  res.status(201).json({
    success: true,
    data: wishlistItem
  })
}

export async function removeFromWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.userId
  const productId = String(req.params.productId)

  // Check if item exists
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })

  if (!existing) {
    throw new NotFoundError('Wishlist item')
  }

  await prisma.wishlist.delete({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })

  res.json({
    success: true,
    message: 'Product removed from wishlist'
  })
}

export async function checkWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.userId
  const productId = String(req.params.productId)

  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })

  res.json({
    success: true,
    data: {
      isInWishlist: !!existing
    }
  })
}
