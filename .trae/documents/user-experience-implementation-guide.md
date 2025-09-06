# Guia de Implementação - Experiência do Usuário
# Caminhos de Hekate

## 1. Estrutura de Pastas do Frontend

```
src/
├── app/                          # App Router (Next.js 14)
│   ├── (auth)/                   # Grupo de rotas de autenticação
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (public)/                 # Site institucional
│   │   ├── page.tsx              # Homepage
│   │   ├── sobre/
│   │   │   └── page.tsx
│   │   ├── cursos/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── comunidade/
│   │   │   └── page.tsx
│   │   ├── precos/
│   │   │   └── page.tsx
│   │   ├── contato/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Área do usuário
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── my-courses/
│   │   │   └── page.tsx
│   │   ├── course/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── lesson/
│   │   │           └── [lessonId]/
│   │   │               └── page.tsx
│   │   ├── community/
│   │   │   ├── page.tsx
│   │   │   ├── topics/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── profile/
│   │   │       └── [userId]/
│   │   │           └── page.tsx
│   │   ├── billing/
│   │   │   └── page.tsx
│   │   ├── certificates/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── community/
│   │   ├── user/
│   │   ├── billing/
│   │   └── analytics/
│   ├── globals.css
│   └── layout.tsx
├── components/                   # Componentes reutilizáveis
│   ├── ui/                       # Componentes base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── progress.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/                   # Componentes de layout
│   │   ├── PublicLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── CourseLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navigation.tsx
│   │   └── Breadcrumbs.tsx
│   ├── auth/                     # Componentes de autenticação
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── withAuth.tsx
│   ├── courses/                  # Componentes de cursos
│   │   ├── CourseCard.tsx
│   │   ├── CourseGrid.tsx
│   │   ├── CourseFilters.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── LessonList.tsx
│   │   ├── LessonProgress.tsx
│   │   ├── CourseProgress.tsx
│   │   ├── BookmarkList.tsx
│   │   ├── NoteEditor.tsx
│   │   └── CertificateViewer.tsx
│   ├── community/                # Componentes da comunidade
│   │   ├── PostCard.tsx
│   │   ├── PostEditor.tsx
│   │   ├── CommentThread.tsx
│   │   ├── CommunityFeed.tsx
│   │   ├── TopicList.tsx
│   │   ├── UserProfile.tsx
│   │   ├── FollowButton.tsx
│   │   └── LikeButton.tsx
│   ├── dashboard/                # Componentes do dashboard
│   │   ├── StatsCards.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── ProgressChart.tsx
│   │   ├── RecommendationsList.tsx
│   │   └── NotificationCenter.tsx
│   ├── billing/                  # Componentes de cobrança
│   │   ├── PricingTable.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── InvoiceList.tsx
│   │   └── SubscriptionStatus.tsx
│   └── common/                   # Componentes comuns
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── SearchBar.tsx
│       ├── Pagination.tsx
│       ├── Modal.tsx
│       ├── Tooltip.tsx
│       └── OptimizedImage.tsx
├── hooks/                        # Hooks customizados
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useCourseProgress.ts
│   ├── useLessonProgress.ts
│   ├── useCommunityFeed.ts
│   ├── usePostActions.ts
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   └── useInfiniteScroll.ts
├── stores/                       # Estado global (Zustand)
│   ├── userStore.ts
│   ├── navigationStore.ts
│   ├── playerStore.ts
│   ├── communityStore.ts
│   └── notificationStore.ts
├── lib/                          # Utilitários e configurações
│   ├── auth.ts
│   ├── supabase.ts
│   ├── prisma.ts
│   ├── validations.ts
│   ├── utils.ts
│   ├── constants.ts
│   ├── analytics.ts
│   ├── monitoring.ts
│   └── cache.ts
├── types/                        # Definições de tipos
│   ├── auth.ts
│   ├── course.ts
│   ├── community.ts
│   ├── user.ts
│   ├── billing.ts
│   └── api.ts
└── styles/                       # Estilos globais
    ├── globals.css
    └── components.css
```

## 2. Componentes Principais Detalhados

### 2.1 Layout Components

#### PublicLayout.tsx
```typescript
interface PublicLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showFooter?: boolean
  className?: string
}

export function PublicLayout({
  children,
  showHeader = true,
  showFooter = true,
  className
}: PublicLayoutProps) {
  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {showHeader && <Header />}
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}
```

#### DashboardLayout.tsx
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
}

export function DashboardLayout({
  children,
  title,
  breadcrumbs,
  actions
}: DashboardLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useNavigationStore()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={cn(
        "transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-0"
      )}>
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showSearch
          showNotifications
        />
        <main className="p-6">
          {(title || breadcrumbs) && (
            <div className="mb-6">
              {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
              {title && (
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {actions && <div className="flex gap-2">{actions}</div>}
                </div>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 2.2 Course Components

#### VideoPlayer.tsx
```typescript
interface VideoPlayerProps {
  src: string
  poster?: string
  lessonId: string
  onProgress?: (progress: number) => void
  onComplete?: () => void
  bookmarks?: Bookmark[]
  notes?: Note[]
}

export function VideoPlayer({
  src,
  poster,
  lessonId,
  onProgress,
  onComplete,
  bookmarks = [],
  notes = []
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    muted,
    fullscreen,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPlaybackRate,
    setVolume,
    setMuted,
    setFullscreen
  } = usePlayerStore()
  
  const { updateProgress } = useLessonProgress(lessonId)
  
  // Implementação do player com controles customizados
  // Salvar progresso automaticamente
  // Gerenciar bookmarks e notas
  // Controles de velocidade, volume, fullscreen
  
  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      {/* Controles customizados */}
      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playbackRate={playbackRate}
        volume={volume}
        muted={muted}
        fullscreen={fullscreen}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onSeek={handleSeek}
        onPlaybackRateChange={setPlaybackRate}
        onVolumeChange={setVolume}
        onMuteToggle={() => setMuted(!muted)}
        onFullscreenToggle={() => setFullscreen(!fullscreen)}
      />
      
      {/* Bookmarks overlay */}
      <BookmarkOverlay
        bookmarks={bookmarks}
        currentTime={currentTime}
        duration={duration}
        onBookmarkClick={handleBookmarkClick}
      />
      
      {/* Notes sidebar */}
      {notes.length > 0 && (
        <NotesPanel
          notes={notes}
          currentTime={currentTime}
          onNoteClick={handleNoteClick}
        />
      )}
    </div>
  )
}
```

#### CourseProgress.tsx
```typescript
interface CourseProgressProps {
  courseId: string
  showDetails?: boolean
  className?: string
}

export function CourseProgress({
  courseId,
  showDetails = false,
  className
}: CourseProgressProps) {
  const { data: progress, isLoading } = useCourseProgress(courseId)
  
  if (isLoading) {
    return <Skeleton className="h-4 w-full" />
  }
  
  if (!progress) {
    return null
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Progresso do curso</span>
        <span className="font-medium">
          {progress.progressPercentage}%
        </span>
      </div>
      
      <Progress value={progress.progressPercentage} className="h-2" />
      
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">{progress.completedLessons}</span>
            <span className="ml-1">de {progress.totalLessons} aulas</span>
          </div>
          <div>
            <span className="font-medium">
              {formatDuration(progress.totalWatchTime)}
            </span>
            <span className="ml-1">assistidas</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2.3 Community Components

#### PostCard.tsx
```typescript
interface PostCardProps {
  post: Post & {
    author: User
    topic: Topic
    _count: {
      comments: number
      likes: number
    }
  }
  variant?: 'full' | 'compact'
  showActions?: boolean
}

export function PostCard({
  post,
  variant = 'full',
  showActions = true
}: PostCardProps) {
  const { user } = useAuth()
  const { likePost } = usePostActions(post.id)
  const [isLiked, setIsLiked] = useState(false)
  
  const handleLike = async () => {
    try {
      await likePost.mutateAsync()
      setIsLiked(!isLiked)
    } catch (error) {
      toast.error('Erro ao curtir post')
    }
  }
  
  return (
    <Card className={cn(
      "p-4",
      variant === 'compact' && "p-3"
    )}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author.avatar} />
          <AvatarFallback>
            {post.author.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900">
              {post.author.name}
            </h4>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(post.createdAt, { locale: ptBR })}
            </span>
            <Badge variant="secondary" className="text-xs">
              {post.topic.name}
            </Badge>
          </div>
          
          <h3 className="mt-1 font-semibold text-lg">
            {post.title}
          </h3>
          
          {variant === 'full' && (
            <div className="mt-2 text-gray-700">
              <p className="line-clamp-3">{post.content}</p>
            </div>
          )}
          
          {showActions && (
            <div className="mt-3 flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={cn(
                  "text-gray-500 hover:text-red-500",
                  isLiked && "text-red-500"
                )}
              >
                <Heart className={cn(
                  "h-4 w-4 mr-1",
                  isLiked && "fill-current"
                )} />
                {post._count.likes}
              </Button>
              
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-4 w-4 mr-1" />
                {post._count.comments}
              </Button>
              
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Compartilhar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
```

### 2.4 Dashboard Components

#### StatsCards.tsx
```typescript
interface StatsCardsProps {
  stats: {
    totalCourses: number
    completedCourses: number
    totalWatchTime: number
    currentStreak: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Cursos Inscritos',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'blue'
    },
    {
      title: 'Cursos Concluídos',
      value: stats.completedCourses,
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Tempo de Estudo',
      value: formatDuration(stats.totalWatchTime),
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'Sequência Atual',
      value: `${stats.currentStreak} dias`,
      icon: Flame,
      color: 'orange'
    }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                card.color === 'blue' && "bg-blue-100 text-blue-600",
                card.color === 'green' && "bg-green-100 text-green-600",
                card.color === 'purple' && "bg-purple-100 text-purple-600",
                card.color === 'orange' && "bg-orange-100 text-orange-600"
              )}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

## 3. Hooks Customizados Detalhados

### 3.1 useAuth.ts
```typescript
export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const result = await signIn('credentials', {
        ...credentials,
        redirect: false
      })
      
      if (result?.error) {
        throw new Error(result.error)
      }
      
      return result
    } catch (error) {
      throw error
    }
  }, [])
  
  const logout = useCallback(async () => {
    await signOut({ redirect: false })
    router.push('/')
  }, [router])
  
  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }
      
      return await response.json()
    } catch (error) {
      throw error
    }
  }, [])
  
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    login,
    logout,
    register
  }
}
```

### 3.2 useCourseProgress.ts
```typescript
export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/progress`)
      if (!response.ok) {
        throw new Error('Failed to fetch course progress')
      }
      return response.json()
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  })
}

export function useLessonProgress(lessonId: string) {
  const queryClient = useQueryClient()
  
  const updateProgress = useMutation({
    mutationFn: async (data: ProgressUpdate) => {
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update progress')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lesson-progress', lessonId])
      queryClient.invalidateQueries(['course-progress'])
    }
  })
  
  const addBookmark = useMutation({
    mutationFn: async (data: BookmarkData) => {
      const response = await fetch(`/api/lessons/${lessonId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to add bookmark')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lesson-bookmarks', lessonId])
    }
  })
  
  return {
    updateProgress,
    addBookmark
  }
}
```

## 4. Cronograma de Implementação Detalhado

### Semana 1-2: Fundação e Autenticação

**Dias 1-3: Setup do Projeto**
- [ ] Configurar Next.js 14 com TypeScript
- [ ] Instalar e configurar Tailwind CSS + shadcn/ui
- [ ] Configurar Supabase (database, auth, storage)
- [ ] Setup do Prisma com schema inicial
- [ ] Configurar NextAuth.js

**Dias 4-7: Sistema de Autenticação**
- [ ] Implementar páginas de login/registro
- [ ] Criar componentes de formulário
- [ ] Implementar recuperação de senha
- [ ] Configurar middleware de proteção
- [ ] Testes de autenticação

**Dias 8-10: Layout Base**
- [ ] Criar componentes de layout
- [ ] Implementar navegação responsiva
- [ ] Configurar sistema de rotas
- [ ] Criar componentes UI básicos

### Semana 3: Site Institucional

**Dias 11-13: Páginas Públicas**
- [ ] Homepage com hero section
- [ ] Página sobre e contato
- [ ] Catálogo público de cursos
- [ ] Página de preços

**Dias 14-17: Otimizações**
- [ ] SEO básico (meta tags, sitemap)
- [ ] Otimização de imagens
- [ ] Responsividade mobile
- [ ] Performance inicial

### Semana 4-5: Dashboard do Usuário

**Dias 18-21: Dashboard Principal**
- [ ] Layout do dashboard
- [ ] Cards de estatísticas
- [ ] Feed de atividades
- [ ] Sistema de notificações

**Dias 22-24: Perfil e Configurações**
- [ ] Página de perfil do usuário
- [ ] Configurações da conta
- [ ] Upload de avatar
- [ ] Preferências de notificação

**Dias 25-28: Área "Meus Cursos"**
- [ ] Lista de cursos inscritos
- [ ] Progresso visual
- [ ] Filtros e busca
- [ ] Recomendações

### Semana 6-8: Player de Cursos

**Dias 29-35: Player de Vídeo**
- [ ] Componente de player customizado
- [ ] Controles avançados (velocidade, qualidade)
- [ ] Sistema de progresso automático
- [ ] Fullscreen e responsividade

**Dias 36-42: Funcionalidades Avançadas**
- [ ] Sistema de bookmarks
- [ ] Editor de notas
- [ ] Materiais complementares
- [ ] Quiz e exercícios

**Dias 43-49: Gamificação**
- [ ] Sistema de pontos e níveis
- [ ] Badges e conquistas
- [ ] Certificados automáticos
- [ ] Streak de estudos

### Semana 9-10: Comunidade

**Dias 50-56: Feed da Comunidade**
- [ ] Lista de posts
- [ ] Sistema de curtidas
- [ ] Comentários aninhados
- [ ] Busca e filtros

**Dias 57-63: Interações Sociais**
- [ ] Perfis públicos de usuários
- [ ] Sistema de seguir/seguidores
- [ ] Mensagens privadas
- [ ] Notificações sociais

### Semana 11: Pagamentos

**Dias 64-70: Integração Stripe**
- [ ] Configurar Stripe
- [ ] Fluxo de assinatura
- [ ] Webhook de pagamentos
- [ ] Área de cobrança
- [ ] Gestão de planos

### Semana 12: Finalização

**Dias 71-77: Testes e Otimizações**
- [ ] Testes unitários críticos
- [ ] Testes E2E principais fluxos
- [ ] Otimizações de performance
- [ ] Analytics e monitoramento
- [ ] Deploy e CI/CD

## 5. Checklist de Qualidade

### 5.1 Performance
- [ ] Core Web Vitals dentro dos padrões
- [ ] Lazy loading implementado
- [ ] Imagens otimizadas
- [ ] Code splitting configurado
- [ ] Caching estratégico

### 5.2 Acessibilidade
- [ ] Navegação por teclado
- [ ] Screen readers compatíveis
- [ ] Contraste adequado
- [ ] Alt text em imagens
- [ ] ARIA labels apropriados

### 5.3 SEO
- [ ] Meta tags dinâmicas
- [ ] Structured data
- [ ] Sitemap XML
- [ ] URLs amigáveis
- [ ] Open Graph tags

### 5.4 Segurança
- [ ] Validação client/server
- [ ] Sanitização de inputs
- [ ] Rate limiting
- [ ] Headers de segurança
- [ ] HTTPS obrigatório

### 5.5 UX/UI
- [ ] Design consistente
- [ ] Feedback visual adequado
- [ ] Estados de loading
- [ ] Tratamento de erros
- [ ] Responsividade completa

Este guia fornece uma estrutura detalhada para implementar uma experiência de usuário completa e profissional no projeto Caminhos de Hekate, com foco em qualidade, performance e usabilidade.