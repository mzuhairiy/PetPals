import { Router } from 'express'
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist
} from '../controllers/wishlist'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// All wishlist routes require authentication
router.get('/', authenticate, asyncHandler(getWishlist))
router.post('/', authenticate, asyncHandler(addToWishlist))
router.delete('/:productId', authenticate, asyncHandler(removeFromWishlist))
router.get('/check/:productId', authenticate, asyncHandler(checkWishlist))

export default router
