# Multi-stage build for consolidated Momentum Rider

# Development stage with live reload
FROM node:22-alpine AS development

WORKDIR /app

# Copy package files for both frontend and backend
COPY server/package*.json ./server/
COPY frontend/package*.json ./frontend/

# Install backend dependencies including dev dependencies
WORKDIR /app/server
RUN npm ci

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci

# Copy source code for both frontend and backend
WORKDIR /app
COPY server/ ./server/
COPY frontend/ ./frontend/

# Set port environment variable for development
ENV PORT=3000
ENV NODE_ENV=development
ENV ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://frontend:5173,http://backend:3001

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application in development mode
CMD ["npm", "run", "dev", "--prefix", "server"]

# Frontend builder stage
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build frontend
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./

# Install backend dependencies (disable prepare script for production)
RUN npm ci --only=production --ignore-scripts

# Copy backend source
COPY server/ .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S momentum -u 1001

# Change ownership to non-root user
RUN chown -R momentum:nodejs /app

# Switch to non-root user
USER momentum

# Set port environment variable
ENV PORT=3000
ENV NODE_ENV=production
ENV ALLOWED_ORIGINS=*

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]