# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for building
RUN npm ci

# Copy application code
COPY . .

# Build the frontend
RUN npx vite build

# Debug: Check what was built
RUN ls -la dist/

# Copy static files from the correct location (vite builds to dist/public)
RUN mkdir -p /app/dist-static
RUN if [ -d "dist/public" ] && [ "$(ls -A dist/public)" ]; then cp -r dist/public/* /app/dist-static/; else echo "No dist/public directory or empty"; fi

# Debug: Verify copy worked
RUN ls -la /app/dist-static/

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production

# Copy application code (excluding node_modules)
COPY server ./server
COPY shared ./shared
COPY vite.config.ts ./
COPY tsconfig.json ./

# Copy built frontend from builder stage to where server expects it
COPY --from=builder /app/dist-static ./server/public

# Debug: List contents to verify copy worked
RUN ls -la ./server/public/

# Install tsx for running TypeScript in production
RUN npm install tsx

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S scrumpoker -u 1001

# Change ownership of app directory
RUN chown -R scrumpoker:nodejs /app
USER scrumpoker

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application using tsx to run TypeScript directly
CMD ["npx", "tsx", "server/index.ts"]