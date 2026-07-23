# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache dumb-init

# Copy built output
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/package.json

# Create uploads directory
RUN mkdir -p /app/.output/public/uploads/drivers

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["dumb-init", "node", ".output/server/index.mjs"]
