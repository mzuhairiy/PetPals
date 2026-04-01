import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Silence console.error and console.warn during tests
beforeAll(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.orderItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
  await prisma.$disconnect()
  jest.restoreAllMocks()
})

export { prisma }
