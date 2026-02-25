import { Router } from 'express'
import { register, login, getProfile, forgotPassword, resetPassword } from '../controllers/auth'
import { authenticate } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { registerSchema, loginSchema } from '../validation'

const router = Router()

router.post('/register', validateBody(registerSchema), register)
router.post('/login', validateBody(loginSchema), login)
router.get('/me', authenticate, getProfile)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

export default router
