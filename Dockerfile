# ============================================================================
# Velora Streaming Platform - Production Multi-Stage Dockerfile
# Includes Node.js 20, FFmpeg, and Prisma ORM
# ============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache ffmpeg ffprobe libc6-compat openssl
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# Runner (Web Server)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/media_storage ./media_storage

EXPOSE 3000
CMD ["npm", "run", "start"]
