# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application (if needed)
# RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init and security packages
RUN apk add --no-cache \
    dumb-init \
    clamav \
    clamav-daemon \
    su-exec \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/tests ./tests
# COPY --from=builder /app/docs ./docs

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/temp && \
    chown -R nextjs:nodejs /app

# Copy initialization scripts
COPY --from=builder /app/docker/scripts ./docker/scripts

# Set proper permissions
RUN chmod +x /app/docker/scripts/*.sh 2>/dev/null || true

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]