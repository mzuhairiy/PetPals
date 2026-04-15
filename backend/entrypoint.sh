#!/bin/sh
set -e

echo "=== PetPals Backend Starting ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "Database: $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/g')"
echo "FRONTEND_URL: $FRONTEND_URL"
echo ""

echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1
echo "Migrations complete."

# Only seed if the products table is empty (fresh database)
PRODUCT_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.product.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log('0'); p.\$disconnect(); });
" 2>/dev/null)

if [ "$PRODUCT_COUNT" = "0" ]; then
  echo "Empty database detected. Seeding..."
  node dist/prisma/seed.js 2>&1 || echo "Seeding failed (non-fatal)."
  echo "Seeding complete."
else
  echo "Database already has $PRODUCT_COUNT products. Skipping seed."
fi
echo ""

echo "Starting Node.js server..."
exec node dist/src/server.js
