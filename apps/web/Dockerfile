FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl-dev openssl

# Enable pnpm via corepack (lockfile v9 requires pnpm 9)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config and package.json files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Build the web app (standalone output)
RUN cd apps/web && pnpm run build

# Runtime image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1
CMD ["node", "apps/web/server.js"]
