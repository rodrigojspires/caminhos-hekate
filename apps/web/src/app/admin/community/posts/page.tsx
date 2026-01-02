import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, MessageCircle, MoreHorizontal, Plus, Search, ThumbsUp, AlertTriangle, Edit, Trash2, ChevronLeft, ChevronRight, MessageSquare, Heart, Flag, Pin, EyeOff } from 'lucide-react'
import { Suspense } from 'react'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Gerenciar Posts - Comunidade',
  description: 'Gerencie os posts da comunidade'
}

interface Post {
  id: string
  title: string
  content: string
  status: 'PUBLISHED' | 'DRAFT' | 'HIDDEN'
  isPinned?: boolean
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  topic: {
    id: string
    name: string
    color: string
  }
  commentsCount: number
  reactionsCount: number
  reportsCount: number
  createdAt: string
  updatedAt: string
}

// Função para buscar posts da API
async function getPosts(searchParams?: URLSearchParams): Promise<{
  posts: Post[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}> {
  try {
    const params = new URLSearchParams()
    
    if (searchParams) {
      // Passar parâmetros de busca para a API
      const search = searchParams.get('search')
      const status = searchParams.get('status')
      const topicId = searchParams.get('topicId')
      const page = searchParams.get('page') || '1'
      const limit = searchParams.get('limit') || '10'
      
      if (search) params.set('search', search)
      if (status && status !== 'all') params.set('status', status.toUpperCase())
      if (topicId && topicId !== 'all') params.set('topicId', topicId)
      params.set('page', page)
      params.set('limit', limit)
    }

    const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    const headersList = headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    const proto = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = envBaseUrl || (host ? `${proto}://${host}` : 'http://localhost:3000')
    const response = await fetch(`${baseUrl}/api/admin/community/posts?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        cookie: headersList.get('cookie') ?? ''
      }
    })

    if (!response.ok) {
      throw new Error('Falha ao buscar posts')
    }

    const data = await response.json()
    
    // Mapear dados da API para o formato esperado pelo componente
    const mappedPosts: Post[] = data.posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content || post.excerpt || '',
      status: post.status,
      author: {
        id: post.author.id,
        name: post.author.name || 'Usuário',
        email: post.author.email || '',
        avatar: post.author.image
      },
      topic: post.topic ? {
        id: post.topic.id,
        name: post.topic.name,
        color: post.topic.color || '#6B7280'
      } : {
        id: 'general',
        name: 'Geral',
        color: '#6B7280'
      },
      commentsCount: post._count?.comments || 0,
      reactionsCount: post._count?.reactions || 0,
      reportsCount: post._count?.reports || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isPinned: post.isPinned
    }))

    return {
      posts: mappedPosts,
      pagination: data.pagination
    }
  } catch (error) {
    console.error('Erro ao buscar posts:', error)
    // Retornar dados vazios em caso de erro
    return {
      posts: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      }
    }
  }
}

function getStatusBadge(status: Post['status']) {
  switch (status) {
    case 'PUBLISHED':
      return <Badge variant="default">Publicado</Badge>
    case 'DRAFT':
      return <Badge variant="secondary">Rascunho</Badge>
    case 'HIDDEN':
      return <Badge variant="destructive">Oculto</Badge>
    default:
      return <Badge variant="outline">Desconhecido</Badge>
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Componente de Filtros
function PostsFilters({ searchParams, totalPosts }: {
  searchParams: CommunityPostsPageProps['searchParams']
  totalPosts: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalPosts} posts encontrados
        </p>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Buscar por título ou conteúdo..."
                className="pl-8"
                defaultValue={searchParams.search || ''}
              />
            </div>
          </div>
          <Select name="status" defaultValue={searchParams.status || 'all'}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="hidden">Oculto</SelectItem>
            </SelectContent>
          </Select>
          <Select name="topicId" defaultValue={searchParams.topicId || 'all'}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="1">Tarot</SelectItem>
              <SelectItem value="2">Astrologia</SelectItem>
              <SelectItem value="3">Cristais</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Componente de Paginação
function PostsPagination({ pagination, searchParams }: {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  searchParams: CommunityPostsPageProps['searchParams']
}) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.status) params.set('status', searchParams.status)
    if (searchParams.topicId) params.set('topicId', searchParams.topicId)
    params.set('page', page.toString())
    return `?${params.toString()}`
  }

  if (pagination.pages <= 1) return null

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} posts
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              asChild={pagination.page > 1}
              disabled={pagination.page <= 1}
            >
              {pagination.page > 1 ? (
                <Link href={createPageUrl(pagination.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Link>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </>
              )}
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={createPageUrl(page)}>
                      {page}
                    </Link>
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              asChild={pagination.page < pagination.pages}
              disabled={pagination.page >= pagination.pages}
            >
              {pagination.page < pagination.pages ? (
                <Link href={createPageUrl(pagination.page + 1)}>
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CommunityPostsPageProps {
  searchParams: {
    search?: string
    status?: string
    topicId?: string
    page?: string
    limit?: string
  }
}

export default async function PostsPage({ searchParams }: CommunityPostsPageProps) {
  const urlSearchParams = new URLSearchParams()
  
  // Construir parâmetros de busca
  if (searchParams.search) urlSearchParams.set('search', searchParams.search)
  if (searchParams.status) urlSearchParams.set('status', searchParams.status)
  if (searchParams.topicId) urlSearchParams.set('topicId', searchParams.topicId)
  if (searchParams.page) urlSearchParams.set('page', searchParams.page)
  if (searchParams.limit) urlSearchParams.set('limit', searchParams.limit)
  
  const { posts, pagination } = await getPosts(urlSearchParams)

  async function togglePin(postId: string, pin: boolean) {
    'use server'
    await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/admin/community/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: pin })
    })
  }

  async function setStatus(postId: string, status: 'PUBLISHED' | 'HIDDEN' | 'DRAFT') {
    'use server'
    await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/admin/community/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">
            Gerencie os posts da comunidade ({pagination.total} posts)
          </p>
        </div>
        <div>
          <Button asChild>
            <Link href="/admin/community/posts/new">
              <Plus className="h-4 w-4 mr-2" /> Novo Post
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <PostsFilters 
        searchParams={searchParams}
        totalPosts={pagination.total}
      />

      {/* Tabela de Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Posts ({posts.length})</CardTitle>
          <CardDescription>
            Lista de todos os posts da comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engajamento</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium line-clamp-1">{post.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.content}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(post.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{post.author.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.author.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: post.topic.color }}
                      />
                      <span className="text-sm">{post.topic.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(post.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.commentsCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.reactionsCount}
                      </div>
                      {post.reportsCount > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <Flag className="h-3 w-3" />
                          {post.reportsCount}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/posts/${post.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => { 'use server'; await togglePin(post.id, !post.isPinned) }}
                        >
                          <Pin className="mr-2 h-4 w-4" />
                          {post.isPinned ? 'Desafixar' : 'Fixar'}
                        </DropdownMenuItem>
                        {post.status !== 'HIDDEN' ? (
                          <DropdownMenuItem
                            onClick={async () => { 'use server'; await setStatus(post.id, 'HIDDEN') }}
                          >
                            <EyeOff className="mr-2 h-4 w-4" />
                            Ocultar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={async () => { 'use server'; await setStatus(post.id, 'PUBLISHED') }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Publicar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/posts/${post.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      <PostsPagination 
        pagination={pagination}
        searchParams={searchParams}
      />
    </div>
  )
}
