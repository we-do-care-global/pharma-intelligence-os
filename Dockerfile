# Dockerfile for pharma-intelligence-os
# Multi-stage build for smaller production image

# Stage 1: Build
FROM node:22-alpine@sha256:42651b9b13395c71e56c4c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5 AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine@sha256:42651b9b13395c71e56c4c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5 AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Install serve for static file serving
RUN npm install -g serve@14.2.0

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3000"]