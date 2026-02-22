# PetPals Backend API

REST API backend for the PetPals e-commerce application.

## Tech Stack

- Node.js 20+
- Express 4.x
- PostgreSQL 16+
- Prisma ORM
- TypeScript
- JWT Authentication

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

3. Generate Prisma Client:
```bash
npx prisma generate
```

4. Run migrations:
```bash
npx prisma migrate dev
```

5. Seed database (optional):
```bash
npx prisma db seed
```

### Development

```bash
npm run dev
```

Server runs on http://localhost:5000

### Testing

```bash
npm test
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Products

- `GET /api/products` - List all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (admin only)

## Test Credentials

After seeding:

**Admin:**
- Email: admin@petpals.com
- Password: admin123

**Customer:**
- Email: customer@example.com
- Password: customer123
