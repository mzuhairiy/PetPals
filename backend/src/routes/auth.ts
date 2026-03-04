import { Router } from 'express'
import { register, login, getProfile, forgotPassword, resetPassword, updateProfile, refreshToken, logoutAll } from '../controllers/auth'
import { authenticate } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.post('/register', validateBody(registerSchema), asyncHandler(register))
router.post('/login', validateBody(loginSchema), asyncHandler(login))
router.post('/refresh', authenticate, asyncHandler(refreshToken))
router.post('/logout-all', authenticate, asyncHandler(logoutAll))
router.get('/me', authenticate, asyncHandler(getProfile))
router.put('/me', authenticate, asyncHandler(updateProfile))
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(forgotPassword))
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(resetPassword))

export default router
