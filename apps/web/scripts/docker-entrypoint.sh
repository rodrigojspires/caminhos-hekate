#!/bin/sh
set -e

# Garantir que diretórios existem
mkdir -p /app/apps/web/public/uploads || true
mkdir -p /app/uploads/uploads || true

# Corrigir owner (ignorar erros se volume não permitir)
chown -R node:node /app/apps/web/public/uploads 2>/dev/null || true
chown -R node:node /app/uploads 2>/dev/null || true

# Ajustar permissões (grupo gravável)
chmod -R 775 /app/apps/web/public/uploads 2>/dev/null || true
chmod -R 775 /app/uploads 2>/dev/null || true

# Start como usuário node
exec su-exec node node apps/web/server.js