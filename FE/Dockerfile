# Dependencies stage
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Builder stage
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Build arguments
ARG NEXT_PUBLIC_API_URL=http://localhost:8081/v1

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build application (standalone mode tạo server.js tự động)
RUN npm run build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

# Install dumb-init and wget for healthcheck
RUN apk add dumb-init wget

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy standalone build (includes server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start application (server.js is in standalone root)
CMD ["node", "server.js"]