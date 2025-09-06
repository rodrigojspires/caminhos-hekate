# TODO — Caminhos de Hekate

Esta lista acompanha pendências identificadas nos documentos em `.trae/documents` e no código. Itens marcados como [feito] já foram implementados nesta rodada.

## Alta prioridade

- [feito] API: GET `/api/user/progress` — dados do dashboard do usuário.
- [feito] API: GET `/api/user/activities` — atividades recentes do usuário.
- [feito] API: GET `/api/courses/recommended` — recomendações de cursos.
- [feito] API: GET `/api/payments/history` — histórico de pagamentos com paginação e filtros.
- [feito] API: GET `/api/payments/[id]/receipt` — redireciono/entrego comprovante.
- [feito] API: GET `/api/payments/status` — status de assinatura e próximos pagamentos.
- [feito] API: POST `/api/payments/retry/[issueId]` — reprocessar (simples) pagamento com falha.
- [feito] API: GET `/api/payments/invoice/current` — entrega fatura atual (fallback gerado).
- [feito] API: POST `/api/subscriptions/[id]/pause` — pausar assinatura.
- [feito] API: POST `/api/subscriptions/[id]/resume` — retomar assinatura.
- [feito] API: POST `/api/subscriptions/[id]/cancel` — cancelar assinatura.
- [feito] Frontend: Ajustar RealtimeUpdates para descobrir URL do WS via GET `/api/analytics/ws`.

## Próximas entregas sugeridas

- Analytics em tempo real: hospedar WS em mesma origem (upgrade) ou externalizar porta configurável, com reconexão e assinatura por categoria.
- Busca avançada: implementar PostgreSQL Full-Text Search (índices e função `unified_search`) OU integrar OpenSearch/Elasticsearch; incluir facets derivadas reais.
- Templates de email:
  - Integração real de envio (SendGrid/SES/etc) e fila/worker para scheduled (QUEUED) envios.
  - Suporte a versão/idioma por template e A/B testing.
  - Preview com screenshots multi-dispositivo (pode ser serviço externo/headless).
- Segurança & sessões: criar rotas `GET /api/auth/sessions`, `GET /api/auth/login-history`, `GET /api/auth/security-alerts`, e fluxos 2FA completos (backup codes já parcialmente presentes).
- Gamificação:
  - Substituir placeholders: `/api/gamification/events` com eventos reais.
  - `activity-tracker.getTrackingStats` deixar de retornar mock e consolidar logs.
  - Emails de gamificação: sair do stub e enviar de fato.
- Grupos (WS): autenticação JWT real no cliente (remover `temp-token`) e validação no servidor.
- Calendário: completar integração Outlook (Graph SDK) e remover stub de `userInfo`.
- Documentar variáveis de ambiente necessárias para novas integrações.

## Observações

- Muitos componentes estavam prontos e aguardavam apenas as rotas. As rotas adicionadas mantêm autorização (próprio usuário/admin) e funcionam com o schema atual do Prisma.
- Nos endpoints de recibo/fatura, quando existir `invoiceUrl`/`receiptUrl` no banco, fazemos redirect direto para otimizar a entrega.
- Itens avançados (A/B testing de email, busca semântica) exigem decisões de infraestrutura.

