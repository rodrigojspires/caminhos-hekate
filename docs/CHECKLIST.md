# Checklist de Implementação — Escola Iniciática Caminhos de Hekate

Atualizado: 2025-09-07

Como usar
- [ ] Marque itens concluídos. Anote responsável e data em cada seção.
- [ ] Mantenha observações rápidas sob o item quando necessário.
- [ ] Cada entrega possui DoD (Definition of Done) para aceite funcional.

Pré‑requisitos e Infra
- [ ] Variáveis .env definidas (dev/stage/prod)
  - [ ] `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - [ ] `DATABASE_URL`
  - [ ] `REDIS_URL`
  - [ ] SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `DEFAULT_FROM_EMAIL`, `DEFAULT_FROM_NAME`
  - [ ] Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`
  - [ ] Evolution API (WhatsApp): `WHATSAPP_API_BASE_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_DEVICE_ID`
  - [ ] Storage (R2/S3) se aplicável: `S3_*`/`R2_*`
- [ ] Docker Compose local sobe com Postgres/Redis/SMTP dev
- [ ] Migrations aplicadas (Prisma) + seed básico
- [ ] Logs estruturados e níveis configurados (info/warn/error)

## Infra & Deploy (Produção)

Compose/Serviços
- [ ] `docker-compose.prod.yml` sobe saudável: `postgres`, `redis`, `web`, `worker-email`, `worker-reminders`
- [ ] `web` exposto em `127.0.0.1:3001→3000`; workers em background; políticas `restart: unless-stopped`
- [ ] `REDIS_URL` e `DATABASE_URL` válidos no `web` e nos workers
- [ ] One-off `dbtools` executa seed quando necessário
  - [ ] `docker compose -f docker-compose.prod.yml run --rm dbtools`
- [ ] Migrations aplicadas na produção (`prisma migrate deploy`) antes do primeiro tráfego

Nginx/Proxy
- [ ] `nginx/prod/hekate.conf` (ou `nginx/prod/caminhosdehekate.conf`) instalado e habilitado
- [ ] Domínio configurado no `server_name`; certificados TLS válidos
- [ ] Proxy HTTP → `127.0.0.1:3000`; WebSockets → `127.0.0.1:8080/8081`
- [ ] Headers de upgrade WS OK (`Upgrade`/`Connection`) e `X-Forwarded-*` coerentes
- [ ] Checagem `nginx -t` e `systemctl reload nginx` sem erros

Saúde/Operação
- [ ] Endpoint `GET /api/health` responde 200 (app) e conexões a DB/Redis OK
- [ ] Logs acessíveis: `docker compose -f docker-compose.prod.yml logs -f web worker-email worker-reminders`
- [ ] Rotação/retention de logs definida (journald/logrotate ou stack centralizada)
- [ ] Backups Postgres agendados (retention; teste de restore documentado)
- [ ] Monitoramento/Uptime (HTTP, erros, consumo de CPU/Memória, espaço em disco)

Pagamentos/Webhooks
- [ ] Webhook Mercado Pago aponta para `/api/payments/webhooks/mercadopago`
- [ ] Segredo de webhook definido e validado (`MERCADOPAGO_WEBHOOK_SECRET`)
- [ ] Fluxo sandbox aprovado (vide DoD da Entrega 1)

Segurança
- [ ] `.env` não versionado; segredos rotacionáveis e documentados
- [ ] Portas externas mínimas abertas; firewall ativo
- [ ] Rate limit básico em Nginx para rotas sensíveis (auth/webhooks)

Deploy/Runbook
- [ ] Procedimento de deploy documentado (build/pull + `up -d --no-deps`)
- [ ] Plano de rollback (imagem anterior/tag) com verificação pós-rollback
- [ ] Passo a passo em `docs/README_PROD.md` seguido e atualizado

DoD (Produção)
- [ ] App atende via HTTPS com domínio final; WS funcionando
- [ ] Healthcheck verde; logs sem erros; migrações aplicadas
- [ ] Webhook de pagamento recebendo e processando notificações
- [ ] Backup recente válido; monitoramento gerando alertas

Referência rápida
- Ver `docs/README_PROD.md` para comandos de build/up, Nginx e operação.

## Entrega 1 — Loja + Checkout Mercado Pago

Páginas/UX
- [x] `/loja`: grade de produtos, categorias, busca e filtros
- [x] `/loja/[slug]`: galeria, variações (SKU), preço/estoque, avaliações
- [x] `/carrinho`: itens, cupom, frete (CEP), resumo
- [x] `/checkout`: dados do cliente, endereço, entrega, pagamento (MP)
- [x] `/pedido/[id]/recibo`: status e instruções de pagamento/download

Backend/API
- [x] API carrinho (add/remove/update) com validação de estoque
- [x] API cupom (aplicar/estornar) + regras mín/máx
- [x] API cálculo de frete (tabela simples + CEP)
- [x] API pedido (criar/atualizar) + números de pedido
- [x] Integração Mercado Pago (preferência, back_urls, notification_url)
- [x] Webhook MP atualiza transações e pedidos

E‑mails transacionais
- [x] Pedido criado (pendente)
- [x] Pagamento confirmado
- [x] Falha de pagamento

Testes/DoD
- [ ] Fluxo MP (sandbox) confirma via webhook
- [x] Tabelas de frete aplicadas e refletidas no total
- [x] Pedido visível no Admin (lista + detalhes)

## Entrega 2 — Cursos + Player HLS + Certificado

 Rotas/UX
 - [x] `/cursos`: catálogo com filtros
 - [x] `/cursos/[slug]`: módulos, lições e materiais
 - [x] Player de vídeo HLS com marcações, velocidade e “continuar de onde parou”
 - [x] Quiz opcional por lição + feedback

Backend
- [x] Persistir progresso por lição (tempo e conclusão)
- [x] Gate por inscrição/tier para curso e lições
- [x] Geração de certificado: endpoint `GET /api/certificates/[id].pdf`
- [x] Template PDF: nome do aluno, curso, carga horária, data, número único

Testes/DoD
- [x] Progresso salvo e retomado com fidelidade
- [x] PDF baixável após 100% do curso; valida campos
- [x] API de progresso/quiz bloqueia lições não grátis sem inscrição

## Entrega 3 — Comunidade (Feed + Paywall + Moderação)

 Funcionalidades
 - [x] Feed inicial em `/comunidade/feed` (markdown, preview, contadores)
 - [x] Ordenação por recente/popular (API)
 - [x] Paywall por nível (gating server + CTA)
 - [x] Reações (like) e comentários básicos (API)
 - [x] Comentários aninhados (UI) + like em comentário
 - [x] Seguir tópico/autor (UI) e filtros “Seguindo”
 - [x] Feed principal integrado em `/comunidade`
 - [x] Moderação (UI) — ações de pin/ocultar/publicar e gestão de reports

 Backend
 - [x] APIs públicas de posts (lista/detalhe) e write autenticado (criar post/comentar/reagir)
 - [x] RBAC simples (leitura pública; write autenticado)
 - [x] Gating por tier na resposta (oculta conteúdo e marca `locked`)
 - [x] Indexação no SearchIndex ao criar/editar/deletar posts

DoD
- [x] Conteúdo bloqueado quando nível insuficiente
- [x] Criar post; comentar e reagir funcionando (excluir/editar via Admin)

## Entrega 4 — Downloads Digitais Tokenizados

- [x] Geração de registros `Download` após pagamento aprovado
- [x] Endpoint seguro `GET /api/downloads/[token]` com expiração e limite de downloads
- [x] Assinatura/compra concede acesso conforme regra do produto
- [x] Página `'/dashboard/downloads'` com lista e status

Notas
- [x] Admin: tela de produto expõe campos por variação (URL/Nome/Limite/Expiração) para produtos digitais.

DoD
- [x] Links expiram corretamente; contador incrementa; tentativa fora da regra bloqueia

## Entrega 5 — Assinaturas + Gates de Conteúdo

- [x] Página `/precos` com planos (mensal/anual), upsell e trials
  - [x] Listagem usa `GET /api/payments/plans` (cache no‑store) — retorna somente planos `isActive` com shape: `{ id, name, description, price, interval, intervalCount, trialDays, features[], isPopular, isActive }`
  - [x] Toggle mensal/anual com destaque de economia; badge “Mais popular”
  - [x] CTA abre fluxo de pagamento (PaymentForm) e mostra termos/cancelamento
  - [x] Sucesso redireciona para `/dashboard/subscription` com status
- [x] `/dashboard/subscription` — status da assinatura + ações
  - [x] Componente PaymentStatus: exibe plano, status, próximo ciclo, fatura
  - [x] Ações: pausar, retomar, cancelar (atual ciclo ou imediato)
  - [x] Link para baixar fatura atual `GET /api/payments/invoice/current`
- [x] Criação/renovação/cancelamento de `UserSubscription`
  - [x] `POST /api/payments/process` cria `UserSubscription` + `PaymentTransaction` (MP/Asaas) com `billingInterval`
  - [x] `GET /api/payments/subscriptions/[id]` retorna assinatura + plano + últimos pagamentos
  - [x] `PUT /api/payments/subscriptions/[id]` atualiza `status`, `cancelAtPeriodEnd`
  - [x] `DELETE /api/payments/subscriptions/[id]` cancela imediatamente
  - [x] Webhooks/handlers atualizam `PaymentTransaction.status` e `UserSubscription.status`; ativação/cancelamento ajustam `User.subscriptionTier`
- [x] Gate por tier em posts/cursos/downloads (middleware + server)
  - [x] Util server: `requireTier(userTier, requiredTier)` já aplicado nos endpoints de Posts/Cursos
  - [x] Atualização de `User.subscriptionTier` na ativação/pause/cancel garante gate imediato
  - [x] Middleware: ao acessar conteúdo gated sem permissão → redirect para `/precos?reason=tier&returnTo=...` (posts/cursos)
- [x] Preferências do usuário em `/dashboard/profile`
  - [x] Seção Assinatura: `auto‑renovar` (`cancelAtPeriodEnd`), histórico, notas de fatura
  - [x] Preferências de comunicação (placeholder): email/WhatsApp e quiet hours

Notas
- [x] Downloads incluídos no plano: defina `downloadProductIds` em `SubscriptionPlan.features` (ou `metadata.downloads.products`). Na ativação/resume da assinatura, é gerado um link de download por produto digital listado.
- [x] Admin: página simples para editar downloads por plano em `/admin/subscriptions/plans`.
- [x] Endpoint `GET /api/payments/plans` mapeia Prisma → UI (inclui `monthlyPrice/yearlyPrice` e `features[]`).
- [x] Enum `SubscriptionStatus` inclui `PAUSED` e endpoints de pause/resume/cancel usam o enum.
- [x] Ajuste integração Mercado Pago/Asaas: alinhado `PaymentTransaction.status` para `CANCELED` (1 L) em cancelamentos.
- [x] `POST /api/payments/process` aceita `billingInterval` ('MONTHLY'|'YEARLY') e cobra `monthlyPrice`/`yearlyPrice` conforme o toggle. Persistido em `UserSubscription.metadata.billingInterval`.

DoD
- [x] Upgrade/downgrade: implementar uma das opções
  - [x] Proration simples com crédito aplicado na próxima fatura (`POST /api/payments/subscriptions/[id]/change-plan`)
  - [ ] Janela de troca (ex.: permite trocar 1x/ciclo sem cobrança adicional)
- [x] Bloqueio/desbloqueio imediato após mudança de status (tier do usuário atualizado em tempo real)
- [x] `/precos` exibe planos corretos (mensal/anual/trial) e redireciona pós‑compra
- [x] `/dashboard/subscription` mostra status, permite pausar/retomar/cancelar e baixar fatura
- [x] Downloads incluídos gerados na ativação/retorno; remoção/bloqueio ao cancelar (conforme política)
  - [x] Campo `Download.source` + `sourceRefId` e revogação seletiva por assinatura

## Entrega 6 — Notificações + WhatsApp + Filas BullMQ

Filas
- [x] Configurar BullMQ (Redis) e mover processadores (email/whatsapp/lembretes) para workers
- [x] Retries, backoff e monitor simples no Admin (`/admin/queues` + `/api/queues/status`)

Mensageria
- [x] Integração Evolution API (WhatsApp) com templates
- [x] Preferências (e‑mail/WhatsApp/desativado) + quiet hours por usuário
- [x] Campanhas/Envios: endpoints para enfileirar e agendar (email/WhatsApp/reminders)
- [x] Lembretes: endpoint de agendamento e worker
- [x] Histórico de notificações no perfil (registro em `Notification`)

DoD
- [x] Entregas registradas (sent/failed) com logs em `Notification`
- [x] Respeito às preferências e quiet hours (reagendamento fora de horário)

## Entrega 7 — LGPD + Segurança

Políticas & Consentimento
- [x] Páginas: LGPD, Privacidade, Cookies, Termos
- [x] Banner de cookies com granularidade e registro de consentimento

DSR (Data Subject Requests)
- [x] Exportar conta `POST /api/user/export` (gera JSON baixável)
- [x] Apagar conta `POST /api/user/delete` com confirmação 2 passos (`/delete/start` + token)

Proteções
- [x] Rate limit por IP/rota (Redis) em webhooks e pagamentos
- [x] 2FA UX finalizada (ativar/desativar/códigos de backup)
- [x] Auditoria mínima (logs em `AuditLog` para DSR/consentimento)

DoD
- [x] Consentimento persistido; DSR auditável; limites aplicados

## Entrega 8 — Busca ⌘K + SEO

Busca global
- [x] Integrar Command Palette (⌘K/CTRL+K) ao layout
- [x] Resultados por entidade (produtos/cursos/posts/usuários)
- [x] Facetas básicas e destaque de trechos

SEO
- [x] Endpoints `/api/sitemap` e `/api/robots`
- [x] JSON‑LD para produtos e cursos
- [x] OG meta consistente (títulos/descrições/imagens)

DoD
- [x] Validação do sitemap no Search Console; rich results OK

## Entrega 9 — Admin + Relatórios + QA/CI/CD

Admin/Operação
- [x] NF‑e placeholder no fluxo de pedido (`POST /api/admin/orders/:id/nfe` grava número/URL em metadata)
- [x] Expedição/entregas: status e rastreio (placeholder) (`GET/POST /api/admin/orders/:id/shipments`, `PATCH /api/admin/shipments/:id`)
- [x] Relatórios: vendas, assinaturas, cursos (datas/tags) — páginas em `/admin/reports` + APIs

Qualidade
- [ ] Testes E2E (Playwright): checkout, assistir curso, post/comentário
- [x] CI (GitHub Actions): lint, build, type‑check, migrations dry‑run
- [x] Imagens Docker prod; revisão de recursos no Nginx

DoD
- [ ] Pipeline verde; smoke de produção; relatórios visíveis no Admin

---

Roteiro de Testes (resumo)
- [ ] Checkout (Pix/Boleto/Cartão) → webhook aprova → pedido concluído
- [ ] Curso: progresso salvo + certificado PDF
- [ ] Comunidade: paywall por nível + moderação
- [ ] Downloads: token expira e limita
- [ ] Assinaturas: upgrade/downgrade + gates
- [ ] Notificações: email/WhatsApp com retries
- [ ] LGPD: exportar/apagar conta + consentimento
- [ ] Busca ⌘K: resultados e SEO (sitemap/robots/JSON‑LD)
