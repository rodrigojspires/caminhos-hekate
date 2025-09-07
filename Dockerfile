# Production Dockerfile for Next.js (apps/web) with standalone output
# Multi-stage build using pnpm workspaces

FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.pnpm-store \
    NODE_ENV=production
# libc6-compat for Node deps, and openssl (v3) so Prisma detects correct engine
RUN apk add --no-cache libc6-compat openssl
SHELL ["/bin/sh","-lc"]

# --- Dependencies layer ---
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate
# Install including devDependencies so turbo is available during build
RUN pnpm install --frozen-lockfile --prod=false

# --- Build layer ---
FROM deps AS build
WORKDIR /app
# Copy full repo for build (ensures local packages are available)
COPY . .
# Ensure envs needed at build-time (override at runtime as needed)
ENV NODE_ENV=production
# Generate Prisma client before building
RUN pnpm -w db:generate || (cd packages/database && npx prisma generate)
RUN pnpm -w build

# --- Runtime layer ---
FROM base AS runner
WORKDIR /app
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy standalone output
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/scripts ./apps/web/scripts
COPY --from=build /app/apps/web/src/lib/background ./apps/web/src/lib/background

# tsx to run TypeScript workers
USER root
RUN npm install -g tsx

# Expose HTTP and WebSocket ports
EXPOSE 3000 8080 8081

ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production

USER nextjs
CMD ["node", "apps/web/server.js"]
