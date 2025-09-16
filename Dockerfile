# Production Dockerfile for Next.js (apps/web) with standalone output
# Multi-stage build using pnpm workspaces

FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.pnpm-store \
    NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl
SHELL ["/bin/sh","-lc"]

# --- Dependencies layer ---
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate
RUN pnpm install --frozen-lockfile --prod=false

# --- Build layer ---
FROM deps AS build
WORKDIR /app
COPY . .
ENV NODE_ENV=production
# Gera Prisma client antes do build do Next
RUN pnpm -w db:generate || (cd packages/database && npx prisma generate)
RUN pnpm -w build

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
FROM deps AS worker
WORKDIR /app
# Copia todo repo (scripts, pacotes, etc.)
COPY . .
ENV NODE_ENV=production
# Gera Prisma Client dentro da imagem do worker (evita erro @prisma/client)
RUN cd packages/database && pnpm exec prisma generate
# Não precisa de CMD aqui — o docker-compose fornece o command.
# Também não precisa instalar tsx global; use "pnpm exec tsx" no compose.
