import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { config } from './config'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error'

const app = express()

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api', routes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)
})
