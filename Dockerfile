# ─── Stage 1: Build ───
FROM node:20-alpine AS builder
WORKDIR /app

# Install turbo globally for the build
RUN npm install -g turbo

# Copy workspace root files (package-lock.json is mandatory for npm ci)
COPY package.json package-lock.json turbo.json ./

# Copy all packages (needed for workspace resolution)
COPY packages/ packages/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Build all packages (core → cli/server → web-ui)
RUN turbo run build

# ─── Stage 2: Production dependencies only ───
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/cli/package.json packages/cli/
COPY packages/web-ui/package.json packages/web-ui/

# Install production deps only — excludes vitest, tsx, pino-pretty, etc.
RUN npm ci --omit=dev

# ─── Stage 3: Production runtime ───
FROM node:20-alpine
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S vda && adduser -S vda -G vda

# Copy production node_modules (no devDependencies)
COPY --from=deps /app/node_modules node_modules

# Copy built artifacts
COPY --from=builder /app/package.json .

# Core
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/core/package.json packages/core/

# Server
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/server/package.json packages/server/

# CLI
COPY --from=builder /app/packages/cli/dist packages/cli/dist
COPY --from=builder /app/packages/cli/package.json packages/cli/

# Web UI (static files)
COPY --from=builder /app/packages/web-ui/dist packages/web-ui/dist

# Default environment
ENV NODE_ENV=production
ENV PORT=3333
ENV VDA_AUTH_ENABLED=false
ENV VDA_LOG_LEVEL=info

# The analysis target is mounted as a volume at /data
VOLUME ["/data"]

EXPOSE 3333

USER vda

# Use the CLI's serve command to start the server
CMD ["node", "packages/cli/dist/bin/vda.js", "serve", "/data", "--port", "3333"]
