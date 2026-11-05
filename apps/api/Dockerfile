FROM node:24-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

# Install ALL deps (with dev deps for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

# Clean build artifacts
RUN rm -rf dist tsconfig.tsbuildinfo

# Generate Prisma client types
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

# Build
RUN npm run build

# Now remove dev dependencies - install prod only
WORKDIR /app
RUN pnpm install --frozen-lockfile --prod

# Setup user
RUN addgroup -g 1001 appgroup && adduser -D -u 1001 -G appgroup appuser

WORKDIR /app/apps/api

USER appuser

EXPOSE 3001

CMD ["node", "dist/main"]
