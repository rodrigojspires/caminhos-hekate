#!/bin/bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-180}"
WAIT_INTERVAL_SECONDS=3
FULL_STACK_RESTART="${FULL_STACK_RESTART:-0}"
PRUNE_CONTAINERS="${PRUNE_CONTAINERS:-1}"
PRUNE_IMAGES="${PRUNE_IMAGES:-1}"
PRUNE_VOLUMES="${PRUNE_VOLUMES:-0}"
PRUNE_NETWORKS="${PRUNE_NETWORKS:-0}"

APP_SERVICES=(
  web
  mahalilah
  mahalilah-realtime
  worker-email
  worker-reminders
  worker-subscriptions
  community-ws
)
INFRA_SERVICES=(postgres redis)

# Detect docker compose command
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "❌ docker compose / docker-compose não encontrado"
  exit 1
fi

run_compose() {
  "${DC[@]}" -f "$COMPOSE_FILE" "$@"
}

wait_service_healthy() {
  local service="$1"
  local timeout="$2"
  local start_ts now_ts container_id status

  start_ts="$(date +%s)"
  while true; do
    container_id="$(run_compose ps -q "$service" 2>/dev/null || true)"
    if [[ -n "$container_id" ]]; then
      status="$(
        docker inspect \
          --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
          "$container_id" 2>/dev/null || true
      )"
      if [[ "$status" == "healthy" || "$status" == "running" ]]; then
        echo "✅ $service está $status"
        return 0
      fi
    fi

    now_ts="$(date +%s)"
    if (( now_ts - start_ts >= timeout )); then
      echo "❌ Timeout aguardando $service ficar saudável (${timeout}s)"
      run_compose ps "$service" || true
      return 1
    fi

    sleep "$WAIT_INTERVAL_SECONDS"
  done
}

echo "🔄 Atualizando repositório..."
git pull || {
  echo "❌ Falha ao executar git pull"
  exit 1
}

if [[ "$FULL_STACK_RESTART" == "1" ]]; then
  echo "🧹 FULL_STACK_RESTART=1: derrubando stack completa..."
  run_compose down --remove-orphans || {
    echo "❌ Falha ao parar containers"
    exit 1
  }
fi

echo "🛟 Garantindo infra ativa (postgres/redis) sem derrubar dados..."
run_compose up -d "${INFRA_SERVICES[@]}" || {
  echo "❌ Falha ao subir postgres/redis"
  exit 1
}

wait_service_healthy postgres "$WAIT_TIMEOUT_SECONDS" || exit 1
wait_service_healthy redis "$WAIT_TIMEOUT_SECONDS" || exit 1

# Optional DB migration on deploy
if [[ "${MIGRATE_ON_DEPLOY:-}" == "1" ]]; then
  echo "🗃  Aplicando migrações do banco (dbtools)..."
  DOCKER_BUILDKIT=1 run_compose run --rm dbtools --filter @hekate/database db:migrate:deploy || {
    echo "❌ Falha ao aplicar migrações"
    exit 1
  }
fi

echo "🏗  Build das imagens (BuildKit + paralelo)..."
BUILD_ARGS=()
if [[ -n "${TURBO_TOKEN:-}" ]]; then BUILD_ARGS+=(--build-arg TURBO_TOKEN); fi
if [[ -n "${TURBO_TEAM:-}" ]]; then BUILD_ARGS+=(--build-arg TURBO_TEAM); fi

COMPOSE_DOCKER_CLI_BUILD=0 DOCKER_BUILDKIT=1 \
  run_compose build --parallel "${BUILD_ARGS[@]}" "${APP_SERVICES[@]}" || {
    echo "❌ Falha no build paralelo"
    exit 1
  }

# Optional DB seed on deploy
if [[ "${SEED_ON_DEPLOY:-}" == "1" ]]; then
  echo "🌱 Rodando seed do banco (dbtools)..."
  DOCKER_BUILDKIT=1 run_compose run --rm dbtools || {
    echo "❌ Falha ao rodar seed"
    exit 1
  }
fi

echo "🚀 Atualizando serviços da aplicação (sem reiniciar postgres/redis)..."
run_compose up -d --no-deps "${APP_SERVICES[@]}" || {
  echo "❌ Falha ao subir serviços da aplicação"
  exit 1
}

if [[ "$PRUNE_CONTAINERS" == "1" ]]; then
  echo -e "\n=== Limpando containers parados ==="
  docker container prune -f >/dev/null 2>&1 || true
fi

if [[ "$PRUNE_IMAGES" == "1" ]]; then
  echo -e "\n=== Limpando imagens dangling ==="
  docker image prune -f >/dev/null 2>&1 || true
fi

if [[ "$PRUNE_VOLUMES" == "1" ]]; then
  echo -e "\n=== Limpando volumes órfãos ==="
  docker volume prune -f >/dev/null 2>&1 || true
fi

if [[ "$PRUNE_NETWORKS" == "1" ]]; then
  echo -e "\n=== Limpando redes não usadas ==="
  docker network prune -f >/dev/null 2>&1 || true
fi

echo "✅ Deploy concluído com sucesso!"
