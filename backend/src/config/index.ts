function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: requireEnv('DATABASE_URL')
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    getBaseUrl: function() {
      // For Snap API, use app domain (not api domain)
      return this.isProduction 
        ? 'https://app.midtrans.com' 
        : 'https://app.sandbox.midtrans.com'
    }
  },
  biteship: {
    apiKey: process.env.BITESHIP_API_KEY || '',
    isProduction: process.env.BITESHIP_IS_PRODUCTION === 'true',
    getBaseUrl: function() {
      return this.isProduction
        ? 'https://api.biteship.com'
        : 'https://api.biteship.com'
    }
  },
  checkout: {
    taxPercentage: 10, // 10% tax
    freeShippingThreshold: 560000, // Free shipping over 560,000 IDR (~$35)
    defaultShippingCost: 25000 // 25,000 IDR shipping (~$1.50)
  }
}
