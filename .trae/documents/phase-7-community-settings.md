# Fase 7: Comunidade e Configurações - Guia de Implementação

## 1. Visão Geral

A Fase 7 implementa o sistema de comunidade e configurações administrativas, incluindo moderação de posts, gerenciamento de tópicos, sistema de relatórios e configurações gerais do sistema.

## 2. Modelos do Prisma

### 2.1 Adições ao Schema

```prisma
// Adicionar ao schema.prisma

model Topic {
  id          String      @id @default(cuid())
  title       String
  description String?
  slug        String      @unique
  category    String?
  pinned      Boolean     @default(false)
  locked      Boolean     @default(false)
  status      TopicStatus @default(ACTIVE)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Relations
  posts       Post[]
  
  @@map("topics")
}

model Post {
  id        String     @id @default(cuid())
  topicId   String
  userId    String
  title     String?
  content   String     @db.Text
  status    PostStatus @default(PUBLISHED)
  pinned    Boolean    @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  
  // Relations
  topic     Topic      @relation(fields: [topicId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id])
  comments  Comment[]
  reports   Report[]
  
  @@map("posts")
}

model Comment {
  id        String        @id @default(cuid())
  postId    String
  userId    String
  content   String        @db.Text
  parentId  String?       // Para respostas aninhadas
  status    CommentStatus @default(PUBLISHED)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  
  // Relations
  post      Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  user      User          @relation(fields: [userId], references: [id])
  parent    Comment?      @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[]     @relation("CommentReplies")
  reports   Report[]
  
  @@map("comments")
}

model Report {
  id          String     @id @default(cuid())
  reporterId  String
  postId      String?
  commentId   String?
  reason      String
  description String?
  status      ReportStatus @default(PENDING)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  // Relations
  reporter    User       @relation(fields: [reporterId], references: [id])
  post        Post?      @relation(fields: [postId], references: [id])
  comment     Comment?   @relation(fields: [commentId], references: [id])
  
  @@map("reports")
}

model SystemSettings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   @db.Text
  type        String   // 'string', 'number', 'boolean', 'json'
  category    String   // 'general', 'email', 'payment', 'community'
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("system_settings")
}

model EmailTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  subject     String
  htmlContent String   @db.Text
  textContent String?  @db.Text
  variables   String[] // Lista de variáveis disponíveis
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("email_templates")
}

// Enums
enum TopicStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum PostStatus {
  DRAFT
  PUBLISHED
  HIDDEN
  DELETED
}

enum CommentStatus {
  PUBLISHED
  HIDDEN
  DELETED
}

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
  DISMISSED
}
```

### 2.2 Atualização do Modelo User

```prisma
// Adicionar ao modelo User existente
model User {
  // ... campos existentes ...
  
  // Novas relations
  posts    Post[]
  comments Comment[]
  reports  Report[]
  
  // ... resto do modelo ...
}
```

## 3. Estrutura de Páginas

### 3.1 Páginas da Comunidade

```
/admin/community/
├── page.tsx              # Dashboard da comunidade
├── topics/
│   ├── page.tsx          # Lista de tópicos
│   ├── [id]/
│   │   └── page.tsx      # Detalhes do tópico
│   └── new/
│       └── page.tsx      # Criar tópico
├── posts/
│   ├── page.tsx          # Lista de posts
│   ├── [id]/
│   │   └── page.tsx      # Detalhes do post
│   └── moderation/
│       └── page.tsx      # Moderação de posts
├── comments/
│   ├── page.tsx          # Lista de comentários
│   └── moderation/
│       └── page.tsx      # Moderação de comentários
└── reports/
    ├── page.tsx          # Lista de relatórios
    └── [id]/
        └── page.tsx      # Detalhes do relatório
```

### 3.2 Páginas de Configurações

```
/admin/settings/
├── page.tsx              # Configurações gerais
├── email/
│   ├── page.tsx          # Configurações de email
│   └── templates/
│       ├── page.tsx      # Lista de templates
│       ├── [id]/
│       │   └── page.tsx  # Editar template
│       └── new/
│           └── page.tsx  # Criar template
├── integrations/
│   └── page.tsx          # Configurações de integrações
└── system/
    └── page.tsx          # Configurações do sistema
```

## 4. APIs da Comunidade

### 4.1 APIs de Tópicos

```typescript
// /api/admin/community/topics/route.ts
GET    /api/admin/community/topics       # Listar tópicos
POST   /api/admin/community/topics       # Criar tópico

// /api/admin/community/topics/[id]/route.ts
GET    /api/admin/community/topics/[id]  # Obter tópico
PUT    /api/admin/community/topics/[id]  # Atualizar tópico
DELETE /api/admin/community/topics/[id]  # Deletar tópico

// /api/admin/community/topics/stats/route.ts
GET    /api/admin/community/topics/stats # Estatísticas de tópicos
```

### 4.2 APIs de Posts

```typescript
// /api/admin/community/posts/route.ts
GET    /api/admin/community/posts        # Listar posts
POST   /api/admin/community/posts        # Criar post

// /api/admin/community/posts/[id]/route.ts
GET    /api/admin/community/posts/[id]   # Obter post
PUT    /api/admin/community/posts/[id]   # Atualizar post
DELETE /api/admin/community/posts/[id]   # Deletar post

// /api/admin/community/posts/moderation/route.ts
GET    /api/admin/community/posts/moderation # Posts para moderação
PUT    /api/admin/community/posts/moderation # Ações de moderação em lote
```

### 4.3 APIs de Comentários

```typescript
// /api/admin/community/comments/route.ts
GET    /api/admin/community/comments     # Listar comentários

// /api/admin/community/comments/[id]/route.ts
GET    /api/admin/community/comments/[id] # Obter comentário
PUT    /api/admin/community/comments/[id] # Atualizar comentário
DELETE /api/admin/community/comments/[id] # Deletar comentário

// /api/admin/community/comments/moderation/route.ts
GET    /api/admin/community/comments/moderation # Comentários para moderação
PUT    /api/admin/community/comments/moderation # Ações de moderação em lote
```

### 4.4 APIs de Relatórios

```typescript
// /api/admin/community/reports/route.ts
GET    /api/admin/community/reports      # Listar relatórios

// /api/admin/community/reports/[id]/route.ts
GET    /api/admin/community/reports/[id] # Obter relatório
PUT    /api/admin/community/reports/[id] # Atualizar status do relatório

// /api/admin/community/reports/stats/route.ts
GET    /api/admin/community/reports/stats # Estatísticas de relatórios
```

## 5. APIs de Configurações

### 5.1 APIs de Configurações do Sistema

```typescript
// /api/admin/settings/route.ts
GET    /api/admin/settings               # Obter todas as configurações
PUT    /api/admin/settings               # Atualizar configurações

// /api/admin/settings/[key]/route.ts
GET    /api/admin/settings/[key]         # Obter configuração específica
PUT    /api/admin/settings/[key]         # Atualizar configuração específica
```

### 5.2 APIs de Templates de Email

```typescript
// /api/admin/settings/email-templates/route.ts
GET    /api/admin/settings/email-templates # Listar templates
POST   /api/admin/settings/email-templates # Criar template

// /api/admin/settings/email-templates/[id]/route.ts
GET    /api/admin/settings/email-templates/[id] # Obter template
PUT    /api/admin/settings/email-templates/[id] # Atualizar template
DELETE /api/admin/settings/email-templates/[id] # Deletar template

// /api/admin/settings/email-templates/[id]/preview/route.ts
POST   /api/admin/settings/email-templates/[id]/preview # Preview do template
```

## 6. Componentes Principais

### 6.1 Componentes da Comunidade

```typescript
// TopicTable.tsx - Lista de tópicos
// TopicForm.tsx - Formulário de tópico
// PostTable.tsx - Lista de posts
// PostForm.tsx - Formulário de post
// PostModerationPanel.tsx - Painel de moderação
// CommentTable.tsx - Lista de comentários
// CommentModerationPanel.tsx - Painel de moderação de comentários
// ReportTable.tsx - Lista de relatórios
// ReportDetails.tsx - Detalhes do relatório
// CommunityStats.tsx - Estatísticas da comunidade
```

### 6.2 Componentes de Configurações

```typescript
// SettingsForm.tsx - Formulário de configurações
// EmailTemplateForm.tsx - Formulário de template de email
// EmailTemplateTable.tsx - Lista de templates
// EmailTemplatePreview.tsx - Preview do template
// IntegrationsPanel.tsx - Painel de integrações
// SystemInfoPanel.tsx - Informações do sistema
```

## 7. Funcionalidades Específicas

### 7.1 Sistema de Moderação

- **Moderação em Lote**: Aprovar/rejeitar múltiplos posts/comentários
- **Filtros Automáticos**: Detecção de spam e conteúdo inadequado
- **Histórico de Moderação**: Log de todas as ações de moderação
- **Notificações**: Alertas para moderadores sobre novo conteúdo

### 7.2 Sistema de Relatórios

- **Categorização**: Diferentes tipos de relatórios (spam, abuso, etc.)
- **Priorização**: Sistema de prioridade baseado no tipo de relatório
- **Resolução**: Fluxo completo de resolução de relatórios
- **Estatísticas**: Métricas sobre relatórios e resoluções

### 7.3 Configurações do Sistema

- **Configurações Gerais**: Nome do site, descrição, logos
- **Configurações de Email**: SMTP, templates, notificações
- **Configurações de Pagamento**: Gateways, moedas, taxas
- **Configurações de Comunidade**: Regras, moderação automática

## 8. Validações Zod

### 8.1 Schemas da Comunidade

```typescript
// lib/validations/community.ts
export const topicSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  pinned: z.boolean().default(false),
  locked: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).default('ACTIVE')
})

export const postSchema = z.object({
  topicId: z.string().min(1, 'Tópico é obrigatório'),
  title: z.string().optional(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN', 'DELETED']).default('PUBLISHED'),
  pinned: z.boolean().default(false)
})

export const commentSchema = z.object({
  postId: z.string().min(1, 'Post é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  parentId: z.string().optional(),
  status: z.enum(['PUBLISHED', 'HIDDEN', 'DELETED']).default('PUBLISHED')
})

export const reportSchema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  description: z.string().optional()
})
```

### 8.2 Schemas de Configurações

```typescript
// lib/validations/settings.ts
export const systemSettingsSchema = z.object({
  siteName: z.string().min(1, 'Nome do site é obrigatório'),
  siteDescription: z.string().optional(),
  siteUrl: z.string().url('URL inválida'),
  contactEmail: z.string().email('Email inválido'),
  maintenanceMode: z.boolean().default(false),
  registrationEnabled: z.boolean().default(true)
})

export const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório'),
  textContent: z.string().optional(),
  variables: z.array(z.string()).default([]),
  active: z.boolean().default(true)
})
```

## 9. Permissões e Segurança

### 9.1 Controle de Acesso

```typescript
// lib/admin/community-permissions.ts
export const communityPermissions = {
  topics: {
    view: ['ADMIN', 'EDITOR'],
    create: ['ADMIN', 'EDITOR'],
    edit: ['ADMIN', 'EDITOR'],
    delete: ['ADMIN']
  },
  posts: {
    view: ['ADMIN', 'EDITOR'],
    moderate: ['ADMIN', 'EDITOR'],
    delete: ['ADMIN']
  },
  comments: {
    view: ['ADMIN', 'EDITOR'],
    moderate: ['ADMIN', 'EDITOR'],
    delete: ['ADMIN']
  },
  reports: {
    view: ['ADMIN', 'EDITOR'],
    resolve: ['ADMIN', 'EDITOR']
  },
  settings: {
    view: ['ADMIN'],
    edit: ['ADMIN']
  }
}
```

## 10. Cronograma de Implementação

### Semana 1: Modelos e APIs Base
- [ ] Atualizar schema Prisma com novos modelos
- [ ] Criar migrações do banco de dados
- [ ] Implementar APIs básicas de tópicos e posts
- [ ] Criar validações Zod

### Semana 2: Interface da Comunidade
- [ ] Criar páginas de listagem de tópicos e posts
- [ ] Implementar componentes de formulário
- [ ] Criar sistema de moderação básico
- [ ] Implementar filtros e busca

### Semana 3: Sistema de Relatórios e Configurações
- [ ] Implementar sistema completo de relatórios
- [ ] Criar interface de configurações do sistema
- [ ] Implementar gerenciamento de templates de email
- [ ] Criar painel de integrações

### Semana 4: Testes e Refinamentos
- [ ] Testes de integração das APIs
- [ ] Testes de interface do usuário
- [ ] Otimizações de performance
- [ ] Documentação final

## 11. Considerações Técnicas

### 11.1 Performance
- Implementar paginação eficiente para listas grandes
- Cache de configurações do sistema
- Índices otimizados no banco de dados
- Lazy loading para componentes pesados

### 11.2 Segurança
- Sanitização de conteúdo HTML
- Rate limiting para APIs públicas
- Validação rigorosa de permissões
- Logs de auditoria para ações administrativas

### 11.3 Escalabilidade
- Estrutura modular para fácil extensão
- Configurações flexíveis via banco de dados
- Sistema de plugins para integrações futuras
- Arquitetura preparada para microserviços

Esta documentação serve como guia completo para a implementação da Fase 7, mantendo consistência com as fases anteriores e seguindo as melhores práticas de desenvolvimento.