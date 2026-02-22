# PetPals Backend API Design

**Date:** 2026-02-22
**Author:** Claude
**Status:** Approved

## Overview

Design for a monolithic REST API backend for the PetPals e-commerce application using Express.js and PostgreSQL.

## System Architecture

### Project Structure

```
PetPals/
├── backend/                      # NEW: Backend server
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts       # PostgreSQL connection
│   │   ├── models/
│   │   │   ├── user.ts           # User model
│   │   │   ├── product.ts        # Product model
│   │   │   ├── order.ts          # Order model
│   │   │   └── index.ts          # Models export
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth routes (register, login)
│   │   │   ├── products.ts       # Product CRUD
│   │   │   ├── orders.ts         # Order operations
│   │   │   └── index.ts          # Routes aggregator
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT verification
│   │   │   └── error.ts          # Error handling
│   │   ├── controllers/
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   └── orders.ts
│   │   ├── types/
│   │   │   └── index.ts          # Shared TypeScript types
│   │   └── server.ts             # Entry point
│   ├── package.json
│   └── tsconfig.json
├── app/                          # Existing Next.js frontend
├── components/                   # Existing components
└── lib/                          # Existing utilities
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20+ | Backend runtime |
| Framework | Express 4.x | REST API server |
| Database | PostgreSQL 16+ | Persistent data storage |
| ORM | Prisma 5.x | Type-safe database access |
| Authentication | JWT + bcrypt | Secure user sessions |
| Validation | Zod | Request validation |
| Language | TypeScript 5 | Type safety |

### API Endpoints

```
POST   /api/auth/register       - Create new user account
POST   /api/auth/login          - Authenticate and receive JWT
GET    /api/auth/me             - Get current user profile

GET    /api/products            - List all products (with filters)
GET    /api/products/:id        - Get single product by ID
POST   /api/products            - Create product (admin only)
PUT    /api/products/:id        - Update product (admin only)
DELETE /api/products/:id        - Delete product (admin only)

POST   /api/orders              - Create new order
GET    /api/orders              - Get user's order history
GET    /api/orders/:id          - Get order details
PATCH  /api/orders/:id/status   - Update order status (admin)
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Users    │───1:N─│   Orders    │───1:N─│ OrderItems  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ userId (FK) │       │ orderId (FK)│
│ password    │       │ total       │       │ productId(FK)│
│ name        │       │ status      │       │ quantity    │
│ role        │       │ createdAt   │       │ price       │
│ createdAt   │       └─────────────┘       └─────────────┘
└─────────────┘              │
                      │                      │
                      │                      │
                      └──────────────────────┘
                            │
                    ┌───────────────┐
                    │   Products    │
                    ├───────────────┤
                    │ id (PK)       │
                    │ name          │
                    │ slug          │
                    │ price         │
                    │ stock         │
                    │ category      │
                    │ pet           │
                    └───────────────┘
```

### Table Definitions

#### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| email | VARCHAR(255) | Unique, Not Null |
| password | VARCHAR(255) | Not Null (bcrypt hashed) |
| name | VARCHAR(255) | Not Null |
| role | ENUM | 'customer' or 'admin', Default: 'customer' |
| createdAt | TIMESTAMP | Default: NOW() |
| updatedAt | TIMESTAMP | Default: NOW() |

#### products

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| name | VARCHAR(255) | Not Null |
| slug | VARCHAR(255) | Unique, Not Null |
| description | TEXT | |
| price | DECIMAL(10, 2) | Not Null |
| originalPrice | DECIMAL(10, 2) | |
| image | VARCHAR(500) | |
| category | VARCHAR(50) | 'food', 'toys', 'supplements' |
| pet | VARCHAR(10) | 'cat', 'dog', 'both' |
| rating | DECIMAL(2, 1) | Default: 0 |
| reviewCount | INTEGER | Default: 0 |
| isNew | BOOLEAN | Default: false |
| discount | INTEGER | |
| featured | BOOLEAN | Default: false |
| stock | INTEGER | Default: 0 |
| tags | TEXT[] | Array of strings |
| createdAt | TIMESTAMP | Default: NOW() |
| updatedAt | TIMESTAMP | Default: NOW() |

#### orders

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| userId | UUID | Foreign Key → users.id |
| total | DECIMAL(10, 2) | Not Null |
| status | ENUM | 'pending', 'processing', 'shipped', 'delivered', 'cancelled' |
| paymentMethod | VARCHAR(50) | |
| shippingStreet | VARCHAR(255) | |
| shippingCity | VARCHAR(100) | |
| shippingState | VARCHAR(100) | |
| shippingZipCode | VARCHAR(20) | |
| shippingCountry | VARCHAR(100) | |
| createdAt | TIMESTAMP | Default: NOW() |
| updatedAt | TIMESTAMP | Default: NOW() |

#### order_items

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| orderId | UUID | Foreign Key → orders.id |
| productId | UUID | Foreign Key → products.id |
| quantity | INTEGER | Not Null |
| price | DECIMAL(10, 2) | Not Null (captured at order time) |

## Authentication & Authorization

### Authentication Flow

1. **Register**: User sends email/password → Server hashes password → Creates user → Returns user
2. **Login**: User sends email/password → Server verifies → Generates JWT → Returns token
3. **Protected Routes**: Client includes JWT in Authorization header → Server verifies → Grants access

### JWT Token Structure

```typescript
{
  userId: string,
  email: string,
  role: 'customer' | 'admin',
  iat: number,
  exp: number  // 7 days from issuance
}
```

### Password Security

- bcrypt with salt rounds = 10
- Minimum 6 characters
- Passwords never stored in plain text

### Role-Based Access Control

| Route | Access |
|-------|--------|
| POST /api/auth/register | Public |
| POST /api/auth/login | Public |
| GET /api/products | Public |
| GET /api/products/:id | Public |
| POST /api/orders | Authenticated (customer) |
| GET /api/orders | Authenticated (customer, own orders) |
| POST /api/products | Admin only |
| PUT /api/products/:id | Admin only |
| DELETE /api/products/:id | Admin only |
| PATCH /api/orders/:id/status | Admin only |

## Error Handling & Validation

### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate email) |
| 422 | Validation Error |
| 500 | Server Error |

### Validation with Zod

All incoming requests validated using Zod schemas for:
- Email format and length
- Password minimum length
- Product data integrity
- Order item validation

## Environment Configuration

### Environment Variables (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/petpals"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:3000"
```

### Database Setup

```bash
npx prisma generate     # Generate Prisma Client
npx prisma migrate dev  # Create initial migration
npx prisma db seed      # Seed initial data (optional)
```

## Development Workflow

### Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure database
npx prisma generate
npx prisma migrate dev
npm run dev  # Runs on http://localhost:5000

# Frontend (separate terminal)
cd /Users/mz/Downloads/PetPals/PetPals
npm run dev  # Runs on http://localhost:3000
```

### NPM Scripts

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint src --ext .ts"
}
```

## Testing Strategy

### Test Coverage

API endpoint tests using Jest and Supertest:
- Authentication (register, login, profile)
- Products (list, get, create, update, delete)
- Orders (create, list, get details)

### Test Database

Separate test database, cleaned between test runs.

### MVP Scope

- ✅ API endpoint tests
- ❌ E2E tests (add later)
- ❌ Frontend unit tests (add later)

## Deployment

### Recommended Platform

**Render** (free tier available)
- Built-in PostgreSQL
- Easy GitHub integration
- Deploy both frontend and backend

### Production Checklist

- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Enable database SSL
- Configure CORS for production domain
- Set up database backups
- Configure logging

## Implementation Phases

### Phase 1: Core Setup
- Initialize backend project
- Set up Prisma with PostgreSQL
- Create database schema
- Implement error handling middleware

### Phase 2: Authentication
- User registration endpoint
- Login with JWT
- Protected route middleware
- Role-based access control

### Phase 3: Products
- Product CRUD endpoints
- Filtering and sorting
- Stock management

### Phase 4: Orders
- Order creation
- Order history
- Order status updates

### Phase 5: Frontend Integration
- Update frontend to use API
- Replace localStorage cart
- Replace mock products
- Implement real authentication

## Notes

- This is an MVP design focused on essential features
- Can be scaled to microservices architecture later if needed
- Reviews feature was excluded from MVP scope
- Payment processing is simulated (Stripe integration for future)
