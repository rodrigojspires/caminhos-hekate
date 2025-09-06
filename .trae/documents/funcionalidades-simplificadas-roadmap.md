# Roadmap de Funcionalidades Simplificadas - Caminhos de Hekate

## 1. Visão Geral
Durante as correções de build do projeto, várias funcionalidades foram simplificadas ou implementadas com dados mock para resolver erros de TypeScript. Este documento lista todas essas simplificações e fornece um roadmap para implementação adequada.

## 2. Funcionalidades Críticas (Prioridade Alta)

### 2.1 APIs de Dados Reais
**Status:** Usando dados mock
**Arquivos afetados:**
- `apps/web/src/app/admin/settings/page.tsx`
- `apps/web/src/app/admin/community/comments/page.tsx`
- `apps/web/src/components/ui/search-bar.tsx`
- `apps/web/src/components/dashboard/ProgressOverview.tsx`
- `apps/web/src/components/dashboard/RecommendedCourses.tsx`
- `apps/web/src/components/dashboard/RecentActivity.tsx`

**Implementação necessária:**
- Criar APIs reais para configurações do sistema
- Implementar endpoints para comentários da comunidade
- Desenvolver sistema de busca com dados reais
- Conectar dashboard com dados reais de progresso
- Implementar recomendações baseadas em algoritmos reais

### 2.2 Verificação de Email
**Status:** TODO pendente
**Arquivos afetados:**
- `apps/web/src/components/auth/ProtectedRoute.tsx`
- `apps/web/src/components/auth/AuthGuard.tsx`
- `apps/web/src/lib/tokens.ts`

**Implementação necessária:**
- Implementar verificação real de email
- Criar fluxo de confirmação de email
- Adicionar middleware de verificação
- Corrigir tipagem `emailVerified` (atualmente usando `as any`)

### 2.3 Configurações do Sistema
**Status:** Tipagem inadequada com `as any`
**Arquivos afetados:**
- `apps/web/src/app/api/admin/settings/route.ts`
- `apps/web/src/app/api/admin/settings/email-templates/route.ts`

**Implementação necessária:**
- Criar tipos TypeScript adequados para diferentes tipos de configuração
- Implementar validação de tipos para NUMBER, BOOLEAN, JSON
- Corrigir tipagem de templates de email
- Adicionar validação de entrada robusta

## 3. Funcionalidades Importantes (Prioridade Média)

### 3.1 Segurança e Sessões
**Status:** Dados mock
**Arquivos afetados:**
- `apps/web/src/components/dashboard/settings/SecuritySettings.tsx`

**Implementação necessária:**
- Implementar rastreamento real de sessões ativas
- Criar histórico de login com dados reais
- Adicionar funcionalidade de logout remoto
- Implementar alertas de segurança

### 3.2 Gestão de Usuários
**Status:** Tipagem inadequada
**Arquivos afetados:**
- `apps/web/src/app/api/admin/users/[id]/route.ts`

**Implementação necessária:**
- Corrigir tipagem de `enrollments` (atualmente usando `as any`)
- Implementar seleção adequada de dados relacionados
- Adicionar validação de permissões

### 3.3 Sistema de Notificações
**Status:** Dados mock
**Arquivos afetados:**
- `apps/web/src/components/ui/notification-bell.tsx`

**Implementação necessária:**
- Conectar com sistema real de notificações
- Implementar WebSocket ou polling para atualizações em tempo real
- Adicionar persistência de notificações

## 4. Funcionalidades de Conveniência (Prioridade Baixa)

### 4.1 Importação/Exportação
**Status:** TODO pendente
**Arquivos afetados:**
- `apps/web/src/app/admin/products/page.tsx`

**Implementação necessária:**
- Implementar exportação de dados em CSV/Excel
- Criar funcionalidade de importação em lote
- Adicionar validação de dados importados

### 4.2 Configurações de Dashboard
**Status:** Tipagem inadequada com `as any`
**Arquivos afetados:**
- `apps/web/src/components/dashboard/settings/AccountSettings.tsx`
- `apps/web/src/components/dashboard/settings/NotificationSettings.tsx`
- `apps/web/src/components/dashboard/settings/PrivacySettings.tsx`
- `apps/web/src/components/dashboard/courses/MyCourses.tsx`

**Implementação necessária:**
- Criar enums adequados para gênero, frequência de notificação, níveis de privacidade
- Implementar tipagem forte para ordenação de cursos
- Adicionar validação de formulários

## 5. Comunidade e Moderação

### 5.1 Sistema de Moderação
**Status:** Dados mock
**Arquivos afetados:**
- `apps/web/src/app/admin/community/posts/page.tsx`
- `apps/web/src/app/admin/community/reports/page.tsx`
- `apps/web/src/app/admin/community/topics/page.tsx`

**Implementação necessária:**
- Conectar com dados reais de posts da comunidade
- Implementar sistema de relatórios funcional
- Criar ferramentas de moderação efetivas
- Adicionar sistema de aprovação/rejeição

## 6. Plano de Implementação

### Fase 1 (Semanas 1-2): Fundação
1. Implementar verificação de email real
2. Corrigir todas as tipagens `as any` críticas
3. Criar APIs básicas para substituir dados mock principais

### Fase 2 (Semanas 3-4): Funcionalidades Core
1. Implementar sistema de configurações robusto
2. Desenvolver APIs de comunidade e moderação
3. Criar sistema de notificações real

### Fase 3 (Semanas 5-6): Refinamento
1. Implementar funcionalidades de importação/exportação
2. Adicionar sistema de segurança avançado
3. Otimizar performance e adicionar cache

### Fase 4 (Semana 7): Testes e Validação
1. Testes de integração completos
2. Validação de segurança
3. Testes de performance

## 7. Considerações Técnicas

### 7.1 Banco de Dados
- Verificar se o schema do Prisma suporta todas as funcionalidades necessárias
- Considerar migrações para novos campos
- Implementar índices adequados para performance

### 7.2 Segurança
- Implementar autenticação robusta
- Adicionar autorização baseada em roles
- Validar todas as entradas do usuário
- Implementar rate limiting

### 7.3 Performance
- Implementar cache para dados frequentemente acessados
- Otimizar queries do banco de dados
- Considerar paginação para listas grandes
- Implementar lazy loading onde apropriado

## 8. Métricas de Sucesso
- Todos os `as any` removidos do código
- Todos os TODOs implementados
- Dados mock substituídos por APIs reais
- Testes de cobertura > 80%
- Performance de carregamento < 2s
- Zero vulnerabilidades de segurança críticas