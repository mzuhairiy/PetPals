# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Next.js inlines NEXT_PUBLIC_* vars at build time, so they must be build args
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY

# Build the Next.js app (outputs to .next/standalone with output: 'standalone')
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy the standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Next.js standalone server
CMD ["node", "server.js"]
