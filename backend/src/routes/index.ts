import { Router } from 'express'
import authRoutes from './auth'
import productRoutes from './products'
import orderRoutes from './orders'
import wishlistRoutes from './wishlist'

const router = Router()

router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/orders', orderRoutes)
router.use('/wishlist', wishlistRoutes)

export default router
