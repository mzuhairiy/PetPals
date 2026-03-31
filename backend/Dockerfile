# ── Stage 1: Build ──
FROM node:20-alpine AS builder

# bcrypt requires native compilation tools, openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json package-lock.json ./

# Copy prisma schema (needed for prisma generate)
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Compile TypeScript → dist/
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine AS runner

# bcrypt requires native compilation tools for npm ci
# openssl is required by Prisma engines at runtime
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install production dependencies only
# (@prisma/client is now in dependencies, not devDependencies)
RUN npm ci --omit=dev

# Generate Prisma client in production stage
RUN npx prisma generate

# The compiled output from tsc uses CommonJS (require/module.exports),
# but package.json has "type": "module" which tells Node to expect ESM.
# Remove the "type" field so Node treats .js files as CommonJS.
RUN sed -i '/"type": "module",/d' package.json

# Remove build tools to reduce image size
RUN apk del python3 make g++

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Create an entrypoint script with logging for debugging
RUN printf '#!/bin/sh\n\
set -e\n\
echo "=== PetPals Backend Starting ==="\n\
echo "NODE_ENV: $NODE_ENV"\n\
echo "PORT: $PORT"\n\
echo "Database: $(echo $DATABASE_URL | sed '\''s/:[^@]*@/:***@/g'\'')"\n\
echo "FRONTEND_URL: $FRONTEND_URL"\n\
echo ""\n\
echo "Running Prisma migrations..."\n\
npx prisma migrate deploy 2>&1\n\
echo "Migrations complete."\n\
echo ""\n\
echo "Starting Node.js server..."\n\
exec node dist/server.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
