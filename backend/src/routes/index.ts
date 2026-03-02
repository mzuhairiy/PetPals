import { Router } from 'express'
import authRoutes from './auth'
import productRoutes from './products'
import orderRoutes from './orders'
import wishlistRoutes from './wishlist'
import paymentRoutes from './payments'
import biteshipRoutes from './biteship'

const router = Router()

router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/orders', orderRoutes)
router.use('/wishlist', wishlistRoutes)
router.use('/payments', paymentRoutes)
router.use('/shipments', biteshipRoutes)

export default router
