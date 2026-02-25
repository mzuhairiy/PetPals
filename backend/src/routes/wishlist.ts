import { Router } from 'express'
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist
} from '../controllers/wishlist'
import { authenticate } from '../middleware/auth'

const router = Router()

// All wishlist routes require authentication
router.get('/', authenticate, getWishlist)
router.post('/', authenticate, addToWishlist)
router.delete('/:productId', authenticate, removeFromWishlist)
router.get('/check/:productId', authenticate, checkWishlist)

export default router
