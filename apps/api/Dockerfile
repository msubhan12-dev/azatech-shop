FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl-dev openssl

# Enable pnpm via corepack (lockfile v9 requires pnpm 9)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config and package.json files first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Copy the rest of the source
COPY . .

# Build
RUN cd apps/api && pnpm run build

# Expose port
EXPOSE 3001

# Run migrations and start
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && npm run start"]
