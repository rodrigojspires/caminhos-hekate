# Checklist de Implementação — Escola Iniciática Caminhos de Hekate

Atualizado: {{preencher data}}

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
- [ ] `/cursos`: catálogo com filtros
- [ ] `/cursos/[slug]`: módulos, lições e materiais
- [ ] Player de vídeo HLS com marcações, velocidade e “continuar de onde parou”
- [ ] Quiz opcional por lição + feedback

Backend
- [ ] Persistir progresso por lição (tempo e conclusão)
- [ ] Gate por inscrição/tier para curso e lições
- [ ] Geração de certificado: endpoint `GET /api/certificates/[id].pdf`
- [ ] Template PDF: nome do aluno, curso, carga horária, data, número único

Testes/DoD
- [ ] Progresso salvo e retomado com fidelidade
- [ ] PDF baixável após 100% do curso; valida campos

## Entrega 3 — Comunidade (Feed + Paywall + Moderação)

Funcionalidades
- [ ] Feed em `/comunidade` com posts markdown rico (imagens/vídeos/anexos)
- [ ] Tópicos, seguir tópico/autor, ordenar por recente/popular
- [ ] Comentários aninhados e reações
- [ ] Paywall por nível (Free/Iniciado/Adepto/Sacerdócio)
- [ ] Moderação: aprovar/ocultar, reports, pin de posts

Backend
- [ ] APIs públicas (read) e autenticadas (write) com RBAC
- [ ] Índice básico de busca para posts e comentários

DoD
- [ ] Conteúdo bloqueado quando nível insuficiente
- [ ] Criar/editar/excluir post; comentar e reagir funcionando

## Entrega 4 — Downloads Digitais Tokenizados

- [ ] Geração de registros `Download` após pagamento aprovado
- [ ] Endpoint seguro `GET /api/downloads/[token]` com expiração e limite de downloads
- [ ] Assinatura/compra concede acesso conforme regra do produto
- [ ] Página `'/dashboard/downloads'` com lista e status

DoD
- [ ] Links expiram corretamente; contador incrementa; tentativa fora da regra bloqueia

## Entrega 5 — Assinaturas + Gates de Conteúdo

- [ ] Página `/precos` com planos (mensal/anual), upsell e trials
- [ ] Criação/renovação/cancelamento de `UserSubscription`
- [ ] Gate por tier em posts/cursos/downloads (middleware + server)
- [ ] Preferências do usuário em `/dashboard/profile`

DoD
- [ ] Upgrade/downgrade com proration simples ou janela de troca definida
- [ ] Bloqueio/desbloqueio imediato após mudança de status

## Entrega 6 — Notificações + WhatsApp + Filas BullMQ

Filas
- [ ] Configurar BullMQ (Redis) e mover processadores (email/whatsapp/lembretes) para `packages/workers`
- [ ] Retries, backoff e DLQ; monitor simples no Admin

Mensageria
- [ ] Integração Evolution API (WhatsApp) com templates
- [ ] Preferências (e‑mail/WhatsApp/desativado) + quiet hours por usuário
- [ ] Campanhas com segmentação e agendamento
- [ ] Lembretes: nova lição, post seguido, eventos, renovação de assinatura
- [ ] Histórico de notificações no perfil

DoD
- [ ] Entregas registradas (sent/failed) com logs
- [ ] Respeito às preferências e quiet hours

## Entrega 7 — LGPD + Segurança

Políticas & Consentimento
- [ ] Páginas: LGPD, Privacidade, Cookies, Termos
- [ ] Banner de cookies com granularidade e registro de consentimento

DSR (Data Subject Requests)
- [ ] Exportar conta `POST /api/user/export` (gera ZIP/JSON + e‑mail)
- [ ] Apagar conta `POST /api/user/delete` com confirmação 2 passos

Proteções
- [ ] Rate limit por IP/rota (Redis) em auth/webhooks/POSTs
- [ ] 2FA UX finalizada (ativar/desativar/códigos de backup)
- [ ] Auditoria mínima (quem/quando criou/alterou/publicou)

DoD
- [ ] Consentimento persistido; DSR auditável; limites aplicados

## Entrega 8 — Busca ⌘K + SEO

Busca global
- [ ] Integrar Command Palette (⌘K/CTRL+K) ao layout
- [ ] Resultados por entidade (produtos/cursos/posts/usuários)
- [ ] Facetas básicas e destaque de trechos

SEO
- [ ] Endpoints `/api/sitemap` e `/api/robots`
- [ ] JSON‑LD para produtos e cursos
- [ ] OG meta consistente (títulos/descrições/imagens)

DoD
- [ ] Validação do sitemap no Search Console; rich results OK

## Entrega 9 — Admin + Relatórios + QA/CI/CD

Admin/Operação
- [ ] NF‑e placeholder no fluxo de pedido
- [ ] Expedição/entregas: status e rastreio (placeholder)
- [ ] Relatórios: vendas, assinaturas, cursos (datas/tags)

Qualidade
- [ ] Testes E2E (Playwright): checkout, assistir curso, post/comentário
- [ ] CI (GitHub Actions): lint, build, testes, migrations dry‑run
- [ ] Imagens Docker prod; revisão de recursos no Nginx

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
