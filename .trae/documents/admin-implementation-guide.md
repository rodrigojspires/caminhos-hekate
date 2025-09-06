# Guia de Implementação - Painel Administrativo Caminhos de Hekate

## 1. Visão Geral da Implementação

Este documento detalha os passos necessários para implementar o painel administrativo do sistema Caminhos de Hekate, seguindo a arquitetura e requisitos definidos nos documentos anteriores.

## 2. Estrutura de Pastas Proposta

```
apps/web/src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                 # Layout do painel admin
│   │   ├── page.tsx                   # Dashboard principal
│   │   ├── login/
│   │   │   └── page.tsx              # Página de login admin
│   │   ├── users/
│   │   │   ├── page.tsx              # Lista de usuários
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Detalhes do usuário
│   │   ├── products/
│   │   │   ├── page.tsx              # Lista de produtos
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Criar produto
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Editar produto
│   │   │   └── categories/
│   │   │       └── page.tsx          # Gerenciar categorias
│   │   ├── orders/
│   │   │   ├── page.tsx              # Lista de pedidos
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Detalhes do pedido
│   │   ├── courses/
│   │   │   ├── page.tsx              # Lista de cursos
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Criar curso
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Editar curso
│   │   │       └── modules/
│   │   │           └── page.tsx      # Gerenciar módulos
│   │   ├── community/
│   │   │   ├── page.tsx              # Posts da comunidade
│   │   │   └── topics/
│   │   │       └── page.tsx          # Gerenciar tópicos
│   │   ├── reports/
│   │   │   ├── page.tsx              # Relatórios gerais
│   │   │   ├── sales/
│   │   │   │   └── page.tsx          # Relatórios de vendas
│   │   │   ├── users/
│   │   │   │   └── page.tsx          # Analytics de usuários
│   │   │   └── courses/
│   │   │       └── page.tsx          # Analytics de cursos
│   │   └── settings/
│   │       ├── page.tsx              # Configurações gerais
│   │       ├── email/
│   │       │   └── page.tsx          # Templates de email
│   │       └── integrations/
│   │           └── page.tsx          # Configurações de APIs
│   └── api/
│       └── admin/
│           ├── users/
│           │   ├── route.ts          # GET, POST /api/admin/users
│           │   └── [id]/
│           │       └── route.ts      # GET, PUT, DELETE /api/admin/users/[id]
│           ├── products/
│           │   ├── route.ts          # GET, POST /api/admin/products
│           │   └── [id]/
│           │       └── route.ts      # GET, PUT, DELETE /api/admin/products/[id]
│           ├── orders/
│           │   ├── route.ts          # GET /api/admin/orders
│           │   └── [id]/
│           │       └── route.ts      # GET, PUT /api/admin/orders/[id]
│           ├── courses/
│           │   ├── route.ts          # GET, POST /api/admin/courses
│           │   └── [id]/
│           │       └── route.ts      # GET, PUT, DELETE /api/admin/courses/[id]
│           ├── analytics/
│           │   ├── dashboard/
│           │   │   └── route.ts      # GET /api/admin/analytics/dashboard
│           │   ├── sales/
│           │   │   └── route.ts      # GET /api/admin/analytics/sales
│           │   └── users/
│           │       └── route.ts      # GET /api/admin/analytics/users
│           └── settings/
│               └── route.ts          # GET, PUT /api/admin/settings
├── components/
│   └── admin/
│       ├── layout/
│       │   ├── AdminSidebar.tsx      # Sidebar de navegação
│       │   ├── AdminHeader.tsx       # Header do painel
│       │   └── AdminBreadcrumb.tsx   # Navegação breadcrumb
│       ├── dashboard/
│       │   ├── MetricCard.tsx        # Card de métrica
│       │   ├── SalesChart.tsx        # Gráfico de vendas
│       │   └── RecentOrders.tsx      # Lista de pedidos recentes
│       ├── users/
│       │   ├── UserTable.tsx         # Tabela de usuários
│       │   ├── UserForm.tsx          # Formulário de usuário
│       │   └── UserFilters.tsx       # Filtros de usuários
│       ├── products/
│       │   ├── ProductTable.tsx      # Tabela de produtos
│       │   ├── ProductForm.tsx       # Formulário de produto
│       │   └── ProductImageUpload.tsx # Upload de imagens
│       ├── orders/
│       │   ├── OrderTable.tsx        # Tabela de pedidos
│       │   ├── OrderDetails.tsx      # Detalhes do pedido
│       │   └── OrderStatusUpdate.tsx # Atualizar status
│       ├── courses/
│       │   ├── CourseTable.tsx       # Tabela de cursos
│       │   ├── CourseForm.tsx        # Formulário de curso
│       │   └── ModuleEditor.tsx      # Editor de módulos
│       ├── common/
│       │   ├── DataTable.tsx         # Tabela genérica
│       │   ├── SearchInput.tsx       # Campo de busca
│       │   ├── Pagination.tsx        # Componente de paginação
│       │   ├── LoadingSpinner.tsx    # Indicador de carregamento
│       │   └── ConfirmDialog.tsx     # Dialog de confirmação
│       └── charts/
│           ├── LineChart.tsx         # Gráfico de linha
│           ├── BarChart.tsx          # Gráfico de barras
│           └── DonutChart.tsx        # Gráfico donut
├── lib/
│   └── admin/
│       ├── auth.ts                   # Utilitários de autenticação admin
│       ├── permissions.ts            # Verificação de permissões
│       ├── api.ts                    # Cliente API para admin
│       └── validations.ts            # Schemas de validação Zod
└── hooks/
    └── admin/
        ├── useAdminAuth.ts           # Hook de autenticação admin
        ├── useUsers.ts               # Hook para gerenciar usuários
        ├── useProducts.ts            # Hook para gerenciar produtos
        ├── useOrders.ts              # Hook para gerenciar pedidos
        └── useAnalytics.ts           # Hook para analytics
```

## 3. Fases de Implementação

### Fase 1: Configuração Base (1-2 semanas)

#### 3.1 Configuração de Autenticação Admin
- [ ] Configurar NextAuth.js para roles de admin
- [ ] Criar middleware de verificação de permissões
- [ ] Implementar página de login administrativa
- [ ] Configurar redirecionamentos baseados em role

#### 3.2 Layout Base do Painel
- [ ] Criar layout principal do admin (`apps/web/src/app/admin/layout.tsx`)
- [ ] Implementar sidebar de navegação
- [ ] Criar header com informações do usuário
- [ ] Implementar sistema de breadcrumbs

#### 3.3 Componentes Base
- [ ] Criar componentes de tabela genérica
- [ ] Implementar sistema de paginação
- [ ] Criar componentes de formulário reutilizáveis
- [ ] Implementar sistema de notificações

### Fase 2: Dashboard e Analytics (1-2 semanas)

#### 3.4 Dashboard Principal
- [ ] Implementar cards de métricas principais
- [ ] Criar gráficos de vendas e usuários
- [ ] Implementar lista de atividades recentes
- [ ] Configurar atualização automática de dados

#### 3.5 APIs de Analytics
- [ ] Criar endpoint `/api/admin/analytics/dashboard`
- [ ] Implementar cálculos de métricas principais
- [ ] Criar queries otimizadas para relatórios
- [ ] Implementar cache de dados analytics

### Fase 3: Gerenciamento de Usuários (1-2 semanas)

#### 3.6 Interface de Usuários
- [ ] Criar página de listagem de usuários
- [ ] Implementar filtros e busca de usuários
- [ ] Criar formulário de edição de usuário
- [ ] Implementar gerenciamento de assinaturas

#### 3.7 APIs de Usuários
- [ ] Criar endpoints CRUD para usuários
- [ ] Implementar filtros e paginação
- [ ] Criar endpoints para gerenciar assinaturas
- [ ] Implementar logs de auditoria

### Fase 4: Gerenciamento de Produtos (2-3 semanas)

#### 3.8 Interface de Produtos
- [ ] Criar página de listagem de produtos
- [ ] Implementar formulário de criação/edição
- [ ] Criar sistema de upload de imagens
- [ ] Implementar gerenciamento de categorias
- [ ] Criar controle de estoque

#### 3.9 APIs de Produtos
- [ ] Criar endpoints CRUD para produtos
- [ ] Implementar upload de imagens
- [ ] Criar endpoints para categorias
- [ ] Implementar controle de estoque

### Fase 5: Gerenciamento de Pedidos (1-2 semanas)

#### 3.10 Interface de Pedidos
- [ ] Criar página de listagem de pedidos
- [ ] Implementar detalhes do pedido
- [ ] Criar sistema de atualização de status
- [ ] Implementar relatórios de vendas

#### 3.11 APIs de Pedidos
- [ ] Criar endpoints para listagem e detalhes
- [ ] Implementar atualização de status
- [ ] Criar endpoints de relatórios
- [ ] Integrar com APIs de pagamento

### Fase 6: Gerenciamento de Cursos (2-3 semanas)

#### 3.12 Interface de Cursos
- [ ] Criar página de listagem de cursos
- [ ] Implementar editor de curso
- [ ] Criar gerenciamento de módulos e aulas
- [ ] Implementar acompanhamento de progresso

#### 3.13 APIs de Cursos
- [ ] Criar endpoints CRUD para cursos
- [ ] Implementar gerenciamento de módulos
- [ ] Criar endpoints para inscrições
- [ ] Implementar sistema de certificados

### Fase 7: Comunidade e Configurações (1-2 semanas)

#### 3.14 Gerenciamento da Comunidade
- [ ] Criar moderação de posts
- [ ] Implementar gerenciamento de tópicos
- [ ] Criar sistema de relatórios de conteúdo

#### 3.15 Configurações do Sistema
- [ ] Criar interface de configurações gerais
- [ ] Implementar gerenciamento de templates
- [ ] Criar configurações de integrações

## 4. Dependências Necessárias

### 4.1 Dependências de Produção
```json
{
  "@hookform/resolvers": "^3.3.2",
  "react-hook-form": "^7.48.2",
  "zod": "^3.22.4",
  "zustand": "^4.4.7",
  "recharts": "^2.8.0",
  "react-hot-toast": "^2.4.1",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-tabs": "^1.0.4",
  "date-fns": "^2.30.0",
  "uploadthing": "^6.0.2"
}
```

### 4.2 Dependências de Desenvolvimento
```json
{
  "@types/node": "^20.10.0",
  "@types/react": "^18.2.45",
  "@types/react-dom": "^18.2.18"
}
```

## 5. Configurações de Segurança

### 5.1 Middleware de Autenticação
```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Verificar se é rota admin
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Verificar se usuário tem role ADMIN ou EDITOR
      const token = req.nextauth.token
      if (!token || !['ADMIN', 'EDITOR'].includes(token.role)) {
        return new Response("Unauthorized", { status: 401 })
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/admin/:path*"]
}
```

### 5.2 Verificação de Permissões
```typescript
// lib/admin/permissions.ts
export const checkAdminPermission = (userRole: string, requiredRole: string[]) => {
  return requiredRole.includes(userRole)
}

export const adminPermissions = {
  users: ['ADMIN'],
  products: ['ADMIN', 'EDITOR'],
  orders: ['ADMIN'],
  courses: ['ADMIN', 'EDITOR'],
  community: ['ADMIN', 'EDITOR'],
  settings: ['ADMIN']
}
```

## 6. Testes e Qualidade

### 6.1 Testes Unitários
- [ ] Testes para componentes de formulário
- [ ] Testes para hooks customizados
- [ ] Testes para utilitários de validação

### 6.2 Testes de Integração
- [ ] Testes para APIs administrativas
- [ ] Testes para fluxos de autenticação
- [ ] Testes para operações CRUD

### 6.3 Testes E2E
- [ ] Testes para fluxos principais do admin
- [ ] Testes para criação de produtos
- [ ] Testes para gerenciamento de pedidos

## 7. Deploy e Monitoramento

### 7.1 Configurações de Deploy
- [ ] Configurar variáveis de ambiente para produção
- [ ] Configurar build otimizado
- [ ] Implementar health checks

### 7.2 Monitoramento
- [ ] Implementar logs de auditoria
- [ ] Configurar alertas de erro
- [ ] Implementar métricas de performance

## 8. Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|-------------|
| Fase 1: Configuração Base | 1-2 semanas | NextAuth configurado |
| Fase 2: Dashboard | 1-2 semanas | Fase 1 completa |
| Fase 3: Usuários | 1-2 semanas | Fase 1 completa |
| Fase 4: Produtos | 2-3 semanas | Fase 1 completa |
| Fase 5: Pedidos | 1-2 semanas | Fase 4 completa |
| Fase 6: Cursos | 2-3 semanas | Fase 1 completa |
| Fase 7: Comunidade/Config | 1-2 semanas | Fase 1 completa |
| **Total Estimado** | **9-16 semanas** | - |

## 9. Próximos Passos

1. **Revisar e aprovar** a documentação de requisitos e arquitetura
2. **Configurar ambiente** de desenvolvimento com as dependências necessárias
3. **Iniciar Fase 1** com a configuração base de autenticação e layout
4. **Implementar testes** conforme cada funcionalidade é desenvolvida
5. **Realizar revisões** regulares de código e arquitetura
6. **Preparar deploy** em ambiente de staging para testes

Esta implementação seguirá as melhores práticas de desenvolvimento, com foco em segurança, performance e experiência do usuário.