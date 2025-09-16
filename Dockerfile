# Production Dockerfile for Next.js (apps/web) with standalone output
# Multi-stage build using pnpm workspaces

# syntax = docker/dockerfile:1.4
FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.pnpm-store \
    NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl
SHELL ["/bin/sh","-lc"]

# --- Prune layer (Turbo) ---
FROM base AS pruner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate
COPY . .
RUN pnpm dlx turbo@1.13.4 prune --scope=@hekate/web --docker

# --- Dependencies layer (PRUNED for web) ---
FROM base AS deps-web
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate
COPY --from=pruner /app/out/json/ ./
# Cache pnpm store between builds
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# --- Build layer ---
FROM deps-web AS build
WORKDIR /app
COPY --from=pruner /app/out/full/ ./
# Copia configuracoes de raiz necessárias para o Next/TS
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
COPY --from=pruner /app/turbo.json ./turbo.json
ENV NODE_ENV=production
# Gera Prisma client antes do build do Next
RUN pnpm -w db:generate || (cd packages/database && npx prisma generate)
# Evita conexões externas (Redis) durante o build do Next
RUN SKIP_REDIS=1 pnpm -w build

# --- Runtime layer (WEB) ---
FROM base AS runner
WORKDIR /app
# Usuário para rodar o Next no runtime
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copia o output standalone do Next e assets necessários
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
# (opcional) scripts que o web pode precisar
COPY --from=build /app/apps/web/scripts ./apps/web/scripts
COPY --from=build /app/apps/web/src/lib/background ./apps/web/src/lib/background
# Prisma schema (útil para tarefas de manutenção)
COPY --from=build /app/packages/database/prisma ./packages/database/prisma

ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production

EXPOSE 3000
USER nextjs
CMD ["node", "apps/web/server.js"]

# --- Worker layer (JOBS/QUEUES) ---
FROM base AS worker
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate
# Copia repo completo para workers (precisam de scripts e deps fora do escopo do web)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps
COPY packages ./packages
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false
ENV NODE_ENV=production
# Gera Prisma Client dentro da imagem do worker (evita erro @prisma/client)
RUN cd packages/database && pnpm exec prisma generate
# Não precisa de CMD aqui — o docker-compose fornece o command.
# Também não precisa instalar tsx global; use "pnpm exec tsx" no compose.
