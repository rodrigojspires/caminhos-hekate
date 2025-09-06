# Deploy em Produção — Caminhos de Hekate

Este guia descreve como subir a aplicação em produção usando Dockerfile e docker-compose (sem Nginx no Docker — Nginx roda localmente na VPS).

## Componentes

- PostgreSQL 16 (banco de dados)
- Redis 7 (cache/filas)
- App Next.js (porta 3000) + WebSockets (8080/8081)
- Workers:
  - worker-email: processa fila de e-mails
  - worker-reminders: processa lembretes de calendário
- Nginx fora do Docker como proxy reverso (SSL + proxy de WS)

## Pré-requisitos

- Docker e docker-compose
- Certificados (TLS) instalados no Nginx da VPS
- Variáveis de ambiente definidas em `.env` (produção)

Variáveis essenciais:
- `DATABASE_URL` (Postgres), `REDIS_URL` (Redis)
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME`
- (Pagamentos) MercadoPago/Asaas tokens conforme uso
- (OAuth Calendário) `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`

Se for usar FTS nos endpoints de busca, execute: `apps/web/docs/SQL/fts_setup.sql` no Postgres e defina `SEARCH_ENGINE=fts`.

## Build & Up

1) Copie `.env` para produção e preencha os valores.

2) Build e subir com Compose (produção):

```
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

- Web sobe nas portas:
  - 3000 (HTTP do Next)
  - 8080 (WS analytics)
  - 8081 (WS groups)

> Observação: os workers rodam a partir dos arquivos TypeScript por `tsx` dentro da imagem.

3) Aplique migrações Prisma (opcional exec dentro do container):

```
docker compose -f docker-compose.prod.yml exec web node -e "(async()=>{const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();console.log('connected');process.exit(0)})()"
# ou rode 'prisma migrate deploy' conforme sua automação
```

## Nginx (fora do Docker)

Use `nginx/prod/hekate.conf` como base. Coloque em `/etc/nginx/sites-available/hekate.conf` e crie symlink em `sites-enabled`. Ajustes:
- Substitua `YOUR_DOMAIN_HERE` pelo seu domínio
- Aponte `ssl_certificate`/`ssl_certificate_key` para seus arquivos

O Nginx fará proxy para:
- `127.0.0.1:3000` → app HTTP
- `127.0.0.1:8080` → WS analytics
- `127.0.0.1:8081` → WS groups

Teste e recarregue:

```
nginx -t && sudo systemctl reload nginx
```

## Webhooks de Pagamento

Aponte no provedor para os endpoints públicos do seu domínio:
- MercadoPago: `/api/payments/webhooks/mercadopago`
- Asaas: `/api/payments/webhooks/asaas`

## Logs & Operação

- App/Workers: `docker compose -f docker-compose.prod.yml logs -f web worker-email worker-reminders`
- Se algum serviço cair, o `restart: unless-stopped` tenta reiniciar.

## Atualização de versão

```
docker compose -f docker-compose.prod.yml pull # se usar registry
# ou
docker compose -f docker-compose.prod.yml build

docker compose -f docker-compose.prod.yml up -d --no-deps web worker-email worker-reminders
```

## Dicas

- Para áreas de alto tráfego de WS, considere mudar o número de workers (replicas) e ajustar Nginx `worker_processes`.
- Para busca avançada com FTS, garanta que a função `unified_search` existe no Postgres.
- Para e-mails, configure corretamente as credenciais SMTP e verifique portas (465 TLS/587 STARTTLS).

