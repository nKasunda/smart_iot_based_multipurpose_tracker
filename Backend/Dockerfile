# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build-time sanity: ensure server.js exists
RUN node -c server.js || true

EXPOSE 5000

CMD ["npm", "start"]

