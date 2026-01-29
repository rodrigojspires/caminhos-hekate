#!/bin/sh
set -e

# Não há uploads públicos neste app, mas mantemos a raiz privada caso futuramente seja usada
mkdir -p /app/uploads || true

exec su-exec node node apps/mahalilah/server.js
