#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  . "${ENV_FILE}"
  set +a
fi

CRON_TZ_VALUE="${CRON_TZ:-America/Sao_Paulo}"
APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"
SCHEDULE="${SCHEDULE:-0 3 1 * *}"
CRON_MARKER="# hekate-community-rewards"

if [[ -z "${APP_URL}" ]]; then
  echo "APP_URL nao definido. Exemplo: https://seu-dominio.com"
  exit 1
fi

if [[ -z "${CRON_SECRET}" ]]; then
  echo "CRON_SECRET nao definido."
  exit 1
fi

CRON_CMD="CRON_TZ=${CRON_TZ_VALUE} ${SCHEDULE} curl -fsS -X POST \"${APP_URL}/api/cron/community-rewards\" -H \"Authorization: Bearer ${CRON_SECRET}\" ${CRON_MARKER}"

TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

crontab -l 2>/dev/null | grep -v "${CRON_MARKER}" > "${TMP_FILE}"
echo "${CRON_CMD}" >> "${TMP_FILE}"
crontab "${TMP_FILE}"

echo "Cron instalado/atualizado:"
echo "${CRON_CMD}"
