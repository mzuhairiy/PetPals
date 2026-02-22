import { Request, Response } from 'express'
import prisma from '../config/database'
import { AuthRequest } from '../types'
import { NotFoundError } from '../utils/errors'
import { createProductSchema, updateProductSchema } from '../validation'
import { Prisma } from '@prisma/client'

export async function getProducts(req: Request, res: Response) {
  const { category, pet, search, minPrice, maxPrice, sort } = req.query

  const where: Prisma.ProductWhereInput = {}

  if (category) {
    where.category = category.toString().toUpperCase()
  }

  if (pet) {
    where.pet = pet.toString().toUpperCase()
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

  const products = await prisma.product.findMany({
    where,
    orderBy
  })

  res.json({
    success: true,
    data: products
  })
}

export async function getProduct(req: Request, res: Response) {
  const { id } = req.params

  const product = await prisma.product.findUnique({
    where: { id }
  })

  if (!product) {
    throw new NotFoundError('Product')
  }

  res.json({
    success: true,
    data: product
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
    where: { id },
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
    where: { id }
  })

  res.status(204).send()
}
