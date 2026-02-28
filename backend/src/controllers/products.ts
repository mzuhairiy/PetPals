import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest, Category, Pet } from '../types'
import { NotFoundError } from '../utils/errors'
import { createProductSchema, updateProductSchema } from '../validation'
import { Prisma } from '@prisma/client'

export async function getProducts(req: Request, res: Response) {
  const { category, pet, search, minPrice, maxPrice, sort, page = '1', limit = '20' } = req.query

  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const skip = (pageNum - 1) * limitNum

  const where: Prisma.ProductWhereInput = {}

  if (category) {
    where.category = category.toString().toUpperCase() as Category
  }

  if (pet) {
    where.pet = pet.toString().toUpperCase() as Pet
  }

  if (search) {
    where.OR = [
      { name: { contains: search.toString(), mode: 'insensitive' } },
      { description: { contains: search.toString(), mode: 'insensitive' } }
    ]
  }

  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) where.price.gte = parseFloat(minPrice.toString())
    if (maxPrice) where.price.lte = parseFloat(maxPrice.toString())
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }

  if (sort === 'price_asc') orderBy = { price: 'asc' }
  if (sort === 'price_desc') orderBy = { price: 'desc' }
  if (sort === 'rating') orderBy = { rating: 'desc' }
  if (sort === 'newest') orderBy = { isNew: 'desc' }

  // Get total count for pagination metadata
  const totalCount = await prisma.product.count({ where })

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip,
    take: limitNum
  })

  // Convert Decimal fields to numbers for JSON serialization
  const serializedProducts = products.map(product => ({
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    rating: Number(product.rating)
  }))

  const totalPages = Math.ceil(totalCount / limitNum)

  res.json({
    success: true,
    data: serializedProducts,
    metadata: {
      totalCount,
      currentPage: pageNum,
      totalPages,
      limit: limitNum
    }
  })
}

export async function getProduct(req: Request, res: Response) {
  const { id } = req.params

  const product = await prisma.product.findUnique({
    where: { id: id as string }
  })

  if (!product) {
    throw new NotFoundError('Product')
  }

  // Convert Decimal fields to numbers for JSON serialization
  const serializedProduct = {
    ...product,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    rating: Number(product.rating)
  }

  res.json({
    success: true,
    data: serializedProduct
  })
}

export async function createProduct(req: Request, res: Response) {
  const data = createProductSchema.parse(req.body)

  const product = await prisma.product.create({
    data
  })

  res.status(201).json({
    success: true,
    data: product
  })
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params
  const data = updateProductSchema.parse(req.body)

  const product = await prisma.product.update({
    where: { id: id as string },
    data
  })

  res.json({
    success: true,
    data: product
  })
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params

  await prisma.product.delete({
    where: { id: id as string }
  })

  res.status(204).send()
}

export async function getPriceRange(req: Request, res: Response) {
  const priceRange = await prisma.product.aggregate({
    _min: {
      price: true
    },
    _max: {
      price: true
    }
  })

  res.json({
    success: true,
    data: {
      min: priceRange._min.price ? Number(priceRange._min.price) : 0,
      max: priceRange._max.price ? Number(priceRange._max.price) : 10000
    }
  })
}
