#!/bin/sh
set -e

# Não há uploads públicos neste app, mas mantemos a raiz privada caso futuramente seja usada
mkdir -p /app/uploads || true
mkdir -p /app/deck-images || true
chown -R node:node /app/deck-images 2>/dev/null || true
chmod -R 775 /app/deck-images 2>/dev/null || true

exec su-exec node node apps/mahalilah/server.js
