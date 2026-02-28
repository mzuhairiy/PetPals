import { Router } from 'express'
import { register, login, getProfile, forgotPassword, resetPassword, updateProfile, refreshToken, logoutAll } from '../controllers/auth'
import { authenticate } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation'

const router = Router()

router.post('/register', validateBody(registerSchema), register)
router.post('/login', validateBody(loginSchema), login)
router.post('/refresh', authenticate, refreshToken)
router.post('/logout-all', authenticate, logoutAll)
router.get('/me', authenticate, getProfile)
router.put('/me', authenticate, updateProfile)
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword)

export default router
