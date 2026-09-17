# Stage 1: Build & Obfuscate
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN node obfuscate.js

# Stage 2: Production Runtime (Zero Readable Source Code)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy obfuscated application from builder
COPY --from=builder /app /app

EXPOSE 3003

CMD ["node", "server.js"]