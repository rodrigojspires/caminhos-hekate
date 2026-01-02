#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"

# Detect docker compose command
if command -v docker compose >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ docker compose/ docker-compose não encontrado"; exit 1
fi

echo "🔄 Atualizando repositório..."
git pull || { echo "❌ Falha ao executar git pull"; exit 1; }

echo "🧹 Parando e removendo containers existentes..."
$DC -f "$COMPOSE_FILE" down --remove-orphans || { echo "❌ Falha ao parar containers"; exit 1; }

# Optional DB migration on deploy
if [[ "${MIGRATE_ON_DEPLOY:-}" == "1" ]]; then
  echo "🗃  Aplicando migrações do banco (dbtools)..."
  DOCKER_BUILDKIT=1 $DC -f "$COMPOSE_FILE" run --rm dbtools --filter @hekate/database db:migrate:deploy || {
    echo "❌ Falha ao aplicar migrações"; exit 1; }
fi

echo "🏗  Build das imagens (com BuildKit + paralelo)..."
# Monta build-args para Turbo Remote Cache se disponíveis
BUILD_ARGS=()
if [[ -n "${TURBO_TOKEN:-}" ]]; then BUILD_ARGS+=(--build-arg TURBO_TOKEN); fi
if [[ -n "${TURBO_TEAM:-}" ]]; then BUILD_ARGS+=(--build-arg TURBO_TEAM); fi

# Evita COMPOSE_DOCKER_CLI_BUILD=1 (ignora --parallel). Força BuildKit e paralelismo real do compose
COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=1 $DC -f "$COMPOSE_FILE" build --parallel "${BUILD_ARGS[@]}" web worker-email worker-reminders worker-subscriptions community-ws || {
  echo "❌ Falha no build paralelo"; exit 1; }

# Optional DB seed on deploy (sempre com serviços parados)
if [[ "${SEED_ON_DEPLOY:-}" == "1" ]]; then
  echo "🌱 Rodando seed do banco (dbtools)..."
  DOCKER_BUILDKIT=1 $DC -f "$COMPOSE_FILE" run --rm dbtools || {
    echo "❌ Falha ao rodar seed"; exit 1; }
fi

echo "🚀 Subindo serviços (web, workers e community-ws)..."
$DC -f "$COMPOSE_FILE" up -d --no-deps web worker-email worker-reminders worker-subscriptions community-ws || { echo "❌ Falha ao subir containers web/workers"; exit 1; }

# (Opcional) subir demais serviços declarados
$DC -f "$COMPOSE_FILE" up -d || { echo "❌ Falha ao subir containers"; exit 1; }

echo -e "\n=== Limpando containers parados ==="
docker container prune -f >/dev/null 2>&1 || true

echo -e "\n=== Limpando imagens dangling ==="
docker image prune -f >/dev/null 2>&1 || true

echo -e "\n=== Limpando volumes órfãos ==="
docker volume prune -f >/dev/null 2>&1 || true

echo -e "\n=== Limpando redes não usadas ==="
docker network prune -f >/dev/null 2>&1 || true

echo "✅ Deploy concluído com sucesso!"
