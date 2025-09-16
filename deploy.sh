#!/bin/bash

echo "🔄 Atualizando repositório..."
git pull || { echo "❌ Falha ao executar git pull"; exit 1; }

echo "🧹 Parando e removendo containers existentes..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || { echo "❌ Falha ao parar containers"; exit 1; }

echo "🚀 Subindo containers com nova build..."
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build --parallel || { echo"❌ Falha no build paralelo"; exit 1; }
docker-compose -f docker-compose.prod.yml up -d --no-deps web worker-email worker-reminders || { echo"❌ Falha ao subir containers web"; exit 1; }
docker-compose -f docker-compose.prod.yml up -d || { echo"❌ Falha ao subir containers"; exit 1; }

echo -e "\n=== Limpando containers parados ==="
docker container prune -f

echo -e "\n=== Limpando imagens dangling ==="
docker image prune -f

echo -e "\n=== Limpando volumes órfãos ==="
docker volume prune -f

echo -e "\n=== Limpando redes não usadas ==="
docker network prune -f

echo "✅ Deploy concluído com sucesso!"