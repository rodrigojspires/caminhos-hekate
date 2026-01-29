# Production Dockerfile for Next.js (apps/web) with standalone output
# Multi-stage build using pnpm workspaces

# syntax = docker/dockerfile:1.4
FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.pnpm-store \
    NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl tzdata
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
    pnpm install --no-frozen-lockfile --prod=false

# --- Build layer ---
FROM deps-web AS build
WORKDIR /app
COPY --from=pruner /app/out/full/ ./
# Copia configuracoes de raiz necessárias para o Next/TS
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
COPY --from=pruner /app/turbo.json ./turbo.json
ARG TURBO_TOKEN
ARG TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM
ENV NODE_ENV=production
# Reinstala deps no workspace pruned para evitar binários ausentes em build
RUN pnpm install --no-frozen-lockfile --prod=false
# Gera Prisma client antes do build do Next
RUN pnpm -w db:generate || (cd packages/database && npx prisma generate)
# Evita conexões externas (Redis) durante o build do Next
RUN SKIP_REDIS=1 pnpm -w build

# --- Runtime layer (WEB) ---
FROM base AS runner
WORKDIR /app
# Usar usuário padrão da imagem Node (geralmente uid/gid 1000)
# Evita conflitos de GID já em uso em ambientes de build
# Caso precise, ajuste via USER abaixo

# Copia o output standalone do Next e assets necessários
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
# (opcional) scripts que o web pode precisar
COPY --from=build /app/apps/web/scripts ./apps/web/scripts
COPY --from=build /app/apps/web/src/lib/background ./apps/web/src/lib/background
# Prisma schema (útil para tarefas de manutenção)
COPY --from=build /app/packages/database/prisma ./packages/database/prisma

# Diretórios de upload precisam estar graváveis pelo usuário runtime
RUN mkdir -p /app/apps/web/public/uploads \
    && chown -R node:node /app/apps/web/public/uploads \
    && mkdir -p /app/uploads/uploads \
    && chown -R node:node /app/uploads \
    && chmod -R 775 /app/apps/web/public/uploads /app/uploads

# Instalar su-exec para alternar para usuário node no entrypoint
RUN apk add --no-cache su-exec
# Garantir permissão de execução do entrypoint
RUN chmod +x /app/apps/web/scripts/docker-entrypoint.sh

ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    PRIVATE_UPLOAD_ROOT=/app/uploads

EXPOSE 3000
USER root
ENTRYPOINT ["sh","-lc","/app/apps/web/scripts/docker-entrypoint.sh"]

# --- Worker layer (JOBS/QUEUES) ---
FROM base AS worker
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate
# Copia repo completo para workers (precisam de scripts e deps fora do escopo do web)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.json ./tsconfig.json
COPY apps ./apps
COPY packages ./packages
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile --prod=false
ENV NODE_ENV=production
# Gera Prisma Client dentro da imagem do worker (evita erro @prisma/client)
RUN cd packages/database && pnpm exec prisma generate
# Não precisa de CMD aqui — o docker-compose fornece o command.
# Também não precisa instalar tsx global; use "pnpm exec tsx" no compose.
