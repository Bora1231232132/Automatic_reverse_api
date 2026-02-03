# Bakong Automation - Node/TypeScript app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (use npm install if no package-lock.json)
COPY package*.json ./
RUN npm ci 2>/dev/null || npm install

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy built output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
