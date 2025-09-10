# Plano de Ação: Remoção de Hard-Codes + Integração de Endpoints + Tema

## Visão Geral

Este documento define o plano de ação para implementar os pontos pendentes do checklist "Projeto: Remoção de Hard‑Codes + Integração de Endpoints + Tema", priorizando a substituição de dados estáticos por APIs reais e validação de funcionalidades.

## Priorização e Ordem de Execução

### Fase 1: Certificados (Dashboard) - ALTA PRIORIDADE
**Status**: Em andamento (APIs criadas, UI pendente)
**Prazo**: 1-2 dias

#### 1.1 API: Listar certificados do usuário
- **Status**: ✅ Concluído
- **Endpoints**: 
  - `GET /api/user/certificates` (lista)
  - `GET /api/user/certificates/stats` (estatísticas)
- **Validação**: Confirmar geração PDF disponível (`GET /api/certificates/[id].pdf`)

#### 1.2 UI: Preencher CertificateStats e CertificateGallery
- **Status**: 🔄 Em andamento
- **Arquivo**: `apps/web/src/app/dashboard/certificates/page.tsx`
- **Critérios de aceite**:
  - [ ] CertificateStats exibe dados reais (total, concluídos, pendentes)
  - [ ] CertificateGallery lista certificados com preview e download
  - [ ] Loading states e tratamento de erros implementados
  - [ ] Responsividade mantida

**Dependências**: Nenhuma
**Bloqueadores**: Nenhum

### Fase 2: Cursos (Dashboard) - ALTA PRIORIDADE
**Prazo**: 2-3 dias

#### 2.1 API: Cursos matriculados com progresso
- **Status**: ⏳ Pendente
- **Opções**:
  - Reusar `GET /api/user/progress` (campo `courseProgress`)
  - Criar endpoint específico `GET /api/user/courses`
- **Critérios de aceite**:
  - [ ] Retorna cursos matriculados do usuário
  - [ ] Inclui progresso agregado por curso
  - [ ] Dados de módulos e lições concluídas
  - [ ] Tempo total de estudo

#### 2.2 UI: Popular MyCourses
- **Status**: ⏳ Pendente
- **Arquivo**: `apps/web/src/app/dashboard/courses/page.tsx`
- **Critérios de aceite**:
  - [ ] Lista cursos matriculados com progresso visual
  - [ ] Cards com thumbnail, título, progresso e CTA
  - [ ] Filtros por status (em andamento, concluído, não iniciado)
  - [ ] Loading skeleton durante carregamento

**Dependências**: API de cursos
**Bloqueadores**: Nenhum

### Fase 3: Validações de Tema - MÉDIA PRIORIDADE
**Prazo**: 1 dia

#### 3.1 Validar ThemeToggle
- **Status**: ⏳ Pendente
- **Escopo**: Site público e dashboard
- **Critérios de aceite**:
  - [ ] Persistência entre rotas mantida
  - [ ] Toggle funciona em todas as páginas
  - [ ] Não há conflitos com next-themes
  - [ ] Transições suaves entre temas

#### 3.2 Documentar fallback e SSR
- **Status**: ⏳ Pendente
- **Critérios de aceite**:
  - [ ] Documentação sobre fallback para `system`
  - [ ] Impacto de SSR/Hydration explicado
  - [ ] Guia de troubleshooting para temas

**Dependências**: Nenhuma
**Bloqueadores**: Nenhum

### Fase 4: Dashboard do Usuário - MÉDIA PRIORIDADE
**Prazo**: 2 dias

#### 4.1 RecentActivity: Validar tipos e mapeamento
- **Status**: ⏳ Pendente
- **Arquivo**: `apps/web/src/components/dashboard/RecentActivity.tsx`
- **Critérios de aceite**:
  - [ ] Consome `GET /api/user/activities` corretamente
  - [ ] Tipos TypeScript alinhados com API
  - [ ] Mapeamento de dados sem erros
  - [ ] Fallback para lista vazia

#### 4.2 ProgressOverview: Validar shape e erros
- **Status**: ⏳ Pendente
- **Arquivo**: `apps/web/src/components/dashboard/ProgressOverview.tsx`
- **Critérios de aceite**:
  - [ ] Consome `GET /api/user/progress` corretamente
  - [ ] Tratamento de erros robusto
  - [ ] Loading states apropriados
  - [ ] Dados exibidos corretamente

**Dependências**: APIs existentes
**Bloqueadores**: Nenhum

### Fase 5: Analytics sem Mocks - MÉDIA PRIORIDADE
**Prazo**: 1-2 dias

#### 5.1 EventsTable sem mockEvents
- **Status**: ⏳ Pendente
- **Arquivo**: `apps/web/src/components/analytics/EventsTable.tsx`
- **Critérios de aceite**:
  - [ ] Remove dados mockados por padrão
  - [ ] Usa `recentEvents` do hook `useAnalytics`
  - [ ] Consome `/api/analytics?type=events` corretamente
  - [ ] Tabela vazia quando sem dados

#### 5.2 Garantir permissões ADMIN vs usuário
- **Status**: ⏳ Pendente
- **Critérios de aceite**:
  - [ ] ADMIN vê dados gerais da plataforma
  - [ ] Usuário comum vê apenas seus dados
  - [ ] Middleware de autorização implementado
  - [ ] Mensagens de erro apropriadas

**Dependências**: Hook useAnalytics existente
**Bloqueadores**: Nenhum

### Fase 6: Admin Dashboard - BAIXA PRIORIDADE
**Prazo**: 2 dias

#### 6.1 Atividades recentes
- **Status**: ⏳ Pendente
- **Critérios de aceite**:
  - [ ] Usa `/api/analytics?type=events` (ADMIN)
  - [ ] Ou endpoint dedicado para atividades
  - [ ] Lista eventos recentes da plataforma
  - [ ] Filtros por tipo de evento

#### 6.2 Ações rápidas dinâmicas
- **Status**: ⏳ Pendente
- **Critérios de aceite**:
  - [ ] Badges dinâmicos (novos pedidos, usuários)
  - [ ] Links mantidos funcionais
  - [ ] Contadores atualizados em tempo real
  - [ ] Performance otimizada

**Dependências**: APIs de analytics
**Bloqueadores**: Nenhum

### Fase 7: Gamificação - BAIXA PRIORIDADE
**Prazo**: 3 dias

#### 7.1 Substituir placeholders por dados reais
- **Status**: ⏳ Pendente
- **Arquivos**:
  - `apps/web/src/app/api/gamification/events/route.ts`
  - `apps/web/src/app/api/gamification/events/[id]/scoreboard/route.ts`
  - `apps/web/src/app/api/gamification/events/[id]/enroll/route.ts`
- **Critérios de aceite**:
  - [ ] Dados reais ou UI oculta até backend existir
  - [ ] Endpoints funcionais ou retorno 501 (Not Implemented)
  - [ ] Documentação sobre status de implementação

**Dependências**: Definição de regras de gamificação
**Bloqueadores**: Backend de gamificação não implementado

## Definition of Done (DoD) Geral

### Critérios Obrigatórios
- [ ] **Todos os componentes listados consomem dados de APIs/serviços (sem mocks fixos)**
- [ ] **Erros e loading states tratados (skeleton/placeholder) sem regressão de UX**
- [ ] **Dados sensíveis respeitam permissões (ADMIN x usuário)**
- [ ] **Teste manual: navegação entre páginas mantém tema escolhido**

### Validações Técnicas
- [ ] TypeScript sem erros
- [ ] ESLint sem warnings críticos
- [ ] Build de produção bem-sucedido
- [ ] Testes unitários passando (quando existentes)

### Validações de UX
- [ ] Loading states não causam layout shift
- [ ] Mensagens de erro são user-friendly
- [ ] Responsividade mantida em todos os breakpoints
- [ ] Acessibilidade básica preservada

## Riscos e Mitigações

### Riscos Identificados
1. **APIs não retornando dados esperados**
   - Mitigação: Validar contratos de API antes da integração
   - Fallbacks apropriados implementados

2. **Performance degradada com dados reais**
   - Mitigação: Implementar paginação e lazy loading
   - Monitorar métricas de performance

3. **Regressões de UX durante migração**
   - Mitigação: Testes manuais extensivos
   - Rollback plan definido

4. **Dependências entre fases**
   - Mitigação: Ordem de execução bem definida
   - Comunicação clara sobre bloqueadores

## Cronograma Estimado

| Fase | Duração | Início | Fim |
|------|---------|--------|-----|
| Fase 1: Certificados | 2 dias | Dia 1 | Dia 2 |
| Fase 2: Cursos | 3 dias | Dia 3 | Dia 5 |
| Fase 3: Tema | 1 dia | Dia 6 | Dia 6 |
| Fase 4: Dashboard Usuário | 2 dias | Dia 7 | Dia 8 |
| Fase 5: Analytics | 2 dias | Dia 9 | Dia 10 |
| Fase 6: Admin Dashboard | 2 dias | Dia 11 | Dia 12 |
| Fase 7: Gamificação | 3 dias | Dia 13 | Dia 15 |

**Total estimado**: 15 dias úteis

## Próximos Passos

1. **Imediato**: Finalizar UI de certificados (Fase 1.2)
2. **Curto prazo**: Implementar APIs de cursos (Fase 2.1)
3. **Médio prazo**: Validações de tema e dashboard do usuário
4. **Longo prazo**: Analytics e gamificação

## Observações

- Priorização baseada em impacto no usuário final
- Certificados e cursos são funcionalidades core do dashboard
- Tema afeta toda a experiência do usuário
- Analytics e gamificação são melhorias incrementais
- Flexibilidade para ajustar cronograma conforme necessário