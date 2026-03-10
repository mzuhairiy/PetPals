# ── Stage 1: Build ──
FROM node:20-alpine AS builder

# bcrypt requires native compilation tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json package-lock.json ./

# Copy prisma schema (needed for prisma generate)
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client (uses prisma version from package-lock.json)
RUN npx prisma generate

# Copy source code
COPY . .

# Compile TypeScript → dist/
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine AS runner

# bcrypt requires native compilation tools for npm ci
RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests and install production deps only
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install production deps. prisma is a devDependency so it won't be installed,
# but @prisma/client needs the generated client. We copy it from the builder.
RUN npm ci --omit=dev

# Copy the generated Prisma client from the builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# The compiled output from tsc uses CommonJS (require/module.exports),
# but package.json has "type": "module" which tells Node to expect ESM.
# Remove the "type" field so Node treats .js files as CommonJS.
RUN sed -i '/"type": "module",/d' package.json

# Remove build tools to reduce image size
RUN apk del python3 make g++

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Run database migrations then start the server.
# We copy prisma CLI from builder for migrate deploy.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
