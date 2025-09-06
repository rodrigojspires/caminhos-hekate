# 🌙 Escola Iniciática Caminhos de Hekate

> Portal místico de aprendizado, comunidade e e-commerce dedicado aos mistérios de Hekate

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.8-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## ✨ Características

### 🛍️ E-commerce Completo
- Produtos físicos e digitais
- Checkout com Mercado Pago (Pix, Boleto, Cartão)
- Sistema de cupons e descontos
- Gestão de estoque e entregas
- Downloads digitais protegidos

### 🎓 Plataforma de Cursos
- Vídeos com player HLS
- Progresso de aprendizado
- Certificados automáticos
- Material complementar (PDFs)
- Quizzes opcionais

### 👥 Comunidade Engajada
- Posts com markdown rico
- Sistema de níveis de assinatura
- Comentários e reações
- Upload de mídias
- Paywall por tier

### 📱 Notificações Multicanal
- E-mail via Resend/SendGrid
- WhatsApp via Evolution API
- Preferências personalizadas
- Templates customizáveis
- Quiet hours

### 🔐 Segurança & LGPD
- Autenticação NextAuth
- RBAC (Admin, Editor, Membro, Visitante)
- 2FA opcional
- Consentimento de cookies
- Exportação/exclusão de dados

## 🚀 Quick Start

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose
- pnpm 8.14+

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/hekate-monorepo.git
cd hekate-monorepo
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
# Edite .env.local com suas configurações
```

3. **Inicie os serviços Docker**
```bash
docker-compose up -d
```

4. **Instale as dependências**
```bash
pnpm install
```

5. **Execute as migrações do banco**
```bash
pnpm db:migrate
```

6. **Popule o banco com dados iniciais**
```bash
pnpm db:seed
```

7. **Inicie o servidor de desenvolvimento**
```bash
pnpm dev
```

Acesse http://localhost:3000 🎉

### Credenciais Admin Padrão
- **E-mail:** admin@caminhosdehekate.com.br
- **Senha:** HekateAdmin#2024

⚠️ **IMPORTANTE:** Altere essas credenciais em produção!

## 📁 Estrutura do Projeto

```
hekate-monorepo/
├── apps/
│   └── web/                 # Aplicação Next.js principal
│       ├── app/             # App Router do Next.js 14
│       ├── components/      # Componentes React
│       ├── lib/            # Utilitários e helpers
│       └── public/         # Assets estáticos
├── packages/
│   ├── database/           # Prisma ORM e schemas
│   ├── ui/                # Design System (shadcn/ui)
│   ├── email/             # Templates e envio de e-mails
│   ├── whatsapp/          # Integração Evolution API
│   ├── workers/           # Filas BullMQ
│   └── shared/            # Tipos e utilitários compartilhados
├── docker-compose.yml      # Configuração dos containers
├── turbo.json             # Configuração Turborepo
└── package.json           # Dependências do monorepo
```

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 14** - Framework React com App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilização utility-first
- **shadcn/ui** - Componentes acessíveis
- **Radix UI** - Primitivos de UI
- **React Query** - Estado server-side
- **Zustand** - Estado client-side

### Backend
- **PostgreSQL** - Banco de dados principal
- **Prisma** - ORM type-safe
- **Redis** - Cache e filas
- **BullMQ** - Processamento assíncrono
- **tRPC** - API type-safe

### Integrações
- **Mercado Pago** - Pagamentos
- **Resend/SendGrid** - E-mails
- **Evolution API** - WhatsApp
- **Cloudflare R2/S3** - Armazenamento

### DevOps
- **Docker** - Containerização
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD
- **Playwright** - Testes E2E

## 🔌 Endpoints Recentes

- Analytics:
  - `GET /api/analytics/user/[userId]`
  - `GET /api/analytics/admin/overview`
  - WebSocket em `GET/POST /api/analytics/ws`

- Gamificação:
  - `GET /api/gamification/points` (inclui `todayPoints` e `?includeTransactions=true`)
  - `POST /api/gamification/points` (alias de award)
  - `GET /api/gamification/badges?page=&limit=&rarity=&earned=`
  - `POST /api/webhooks/gamification/activity`
  - `POST /api/webhooks/gamification/achievement-unlock`
  - `GET /api/gamification/events` + `POST /api/gamification/events/[id]/enroll` + `GET /api/gamification/events/[id]/scoreboard`

- E-mail:
  - `POST /api/email-templates/preview` (device: desktop|mobile|tablet)
  - `GET /api/email/sends/[id]`

- Pagamentos:
  - `POST /api/payments/webhooks/mercadopago`
  - `POST /api/payments/webhooks/asaas`

## 🎨 Identidade Visual

### Paleta de Cores
- **Fundo:** #0B0B0F (Preto místico)
- **Destaque:** #DAA520 (Dourado)
- **Neutros:** Escala de cinzas
- **Acentos:** Toques perolados

### Tipografia
- **Títulos:** EB Garamond (serif)
- **Corpo:** Inter/Source Sans (sans-serif)

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento
pnpm build           # Build de produção
pnpm start           # Inicia servidor de produção

# Banco de Dados
pnpm db:generate     # Gera cliente Prisma
pnpm db:migrate      # Executa migrações
pnpm db:seed         # Popula banco
pnpm db:studio       # Abre Prisma Studio

# Testes
pnpm test            # Testes unitários
pnpm test:e2e        # Testes E2E

# Utilitários
pnpm lint            # Linting
pnpm format          # Formatação
pnpm type-check      # Verificação de tipos

# Docker
pnpm docker:up       # Sobe containers
pnpm docker:down     # Para containers
pnpm docker:logs     # Visualiza logs
```

## 🚢 Deploy em Produção

### VPS Ubuntu com Nginx

1. **Configure o servidor**
```bash
# Instale Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone o repositório
git clone https://github.com/seu-usuario/hekate-monorepo.git
cd hekate-monorepo
```

2. **Configure as variáveis de ambiente de produção**
```bash
cp .env.example .env.production
# Configure com valores reais de produção
```

3. **Build e inicie os containers**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Configure SSL com Certbot**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d caminhosdehekate.com.br -d www.caminhosdehekate.com.br
```

## 🧪 Testes

### Executar Smoke Tests
```bash
pnpm test:e2e
```

Os testes cobrem:
- ✅ Navegação na Home
- ✅ Fluxo de compra (sandbox)
- ✅ Login/Logout
- ✅ Paywall da comunidade
- ✅ Progresso de curso

## 📊 Observabilidade

### Logs
- Estruturados com pino/winston
- Request IDs para rastreamento
- Níveis: debug, info, warn, error

### Health Check
Endpoint: `/api/health`

### Rate Limiting
- Configurado via Upstash Redis
- Limites por IP e rota

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Proprietary - Todos os direitos reservados © 2024 Escola Iniciática Caminhos de Hekate

## 🙏 Agradecimentos

Que as tochas de Hekate iluminem os caminhos de todos os contribuidores e usuários deste sistema.

---

**Desenvolvido com 🔥 pela equipe Caminhos de Hekate**
