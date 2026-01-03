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
import { Eye, MoreHorizontal, Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, MessageSquare, Heart, Flag, Pin, EyeOff, ArrowLeft } from 'lucide-react'
import { headers, cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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
  community?: {
    id: string
    name: string
  } | null
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

interface CommunityOption {
  id: string
  name: string
}

interface TopicOption {
  id: string
  name: string
}

function resolveBaseUrl() {
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  return envBaseUrl || (host ? `${proto}://${host}` : 'http://localhost:3000')
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
      const communityId = searchParams.get('communityId')
      const page = searchParams.get('page') || '1'
      const limit = searchParams.get('limit') || '10'
      
      if (search) params.set('search', search)
      if (status && status !== 'all') params.set('status', status.toUpperCase())
      if (topicId && topicId !== 'all') params.set('topicId', topicId)
      if (communityId) params.set('communityId', communityId)
      params.set('page', page)
      params.set('limit', limit)
    }

    const baseUrl = resolveBaseUrl()
    const headersList = headers()
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
      community: post.community ? {
        id: post.community.id,
        name: post.community.name
      } : null,
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

async function getCommunities(): Promise<CommunityOption[]> {
  try {
    const baseUrl = resolveBaseUrl()
    const headersList = headers()
    const response = await fetch(`${baseUrl}/api/admin/communities?limit=200&status=all`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        cookie: headersList.get('cookie') ?? ''
      }
    })
    if (!response.ok) return []
    const data = await response.json()
    if (!Array.isArray(data?.communities)) return []
    return data.communities.map((community: any) => ({
      id: community.id,
      name: community.name
    }))
  } catch (error) {
    console.error('Erro ao buscar comunidades:', error)
    return []
  }
}

async function getTopics(communityId?: string): Promise<TopicOption[]> {
  try {
    const baseUrl = resolveBaseUrl()
    const headersList = headers()
    const params = new URLSearchParams({ limit: '200' })
    if (communityId) params.set('communityId', communityId)
    const response = await fetch(`${baseUrl}/api/admin/community/topics?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        cookie: headersList.get('cookie') ?? ''
      }
    })
    if (!response.ok) return []
    const data = await response.json()
    if (!Array.isArray(data?.topics)) return []
    return data.topics.map((topic: any) => ({
      id: topic.id,
      name: topic.name
    }))
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return []
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
function PostsFilters({ searchParams, totalPosts, communities, topics }: {
  searchParams: CommunityPostsPageProps['searchParams']
  totalPosts: number
  communities: CommunityOption[]
  topics: TopicOption[]
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
          <Select name="communityId" defaultValue={searchParams.communityId || 'all'}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Comunidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as comunidades</SelectItem>
              {communities.map((community) => (
                <SelectItem key={community.id} value={community.id}>
                  {community.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.name}
                </SelectItem>
              ))}
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
    if (searchParams.communityId && searchParams.communityId !== 'all') {
      params.set('communityId', searchParams.communityId)
    }
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
    communityId?: string
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
  if (searchParams.communityId && searchParams.communityId !== 'all') {
    urlSearchParams.set('communityId', searchParams.communityId)
  }
  if (searchParams.page) urlSearchParams.set('page', searchParams.page)
  if (searchParams.limit) urlSearchParams.set('limit', searchParams.limit)
  
  const [postsData, communities, topics] = await Promise.all([
    getPosts(urlSearchParams),
    getCommunities(),
    getTopics(searchParams.communityId && searchParams.communityId !== 'all' ? searchParams.communityId : undefined)
  ])
  const { posts, pagination } = postsData
  const backHref = searchParams.communityId && searchParams.communityId !== 'all'
    ? `/admin/community/communities/${searchParams.communityId}`
    : '/admin/community'

  async function togglePin(formData: FormData) {
    'use server'
    const postId = String(formData.get('postId') || '')
    const pin = formData.get('pin') === 'true'
    const baseUrl = resolveBaseUrl()
    const cookieHeader = cookies().toString()
    await fetch(`${baseUrl}/api/admin/community/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
      body: JSON.stringify({ isPinned: pin })
    })
    revalidatePath('/admin/community/posts')
  }

  async function setStatus(formData: FormData) {
    'use server'
    const postId = String(formData.get('postId') || '')
    const status = String(formData.get('status') || '')
    const baseUrl = resolveBaseUrl()
    const cookieHeader = cookies().toString()
    await fetch(`${baseUrl}/api/admin/community/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
      body: JSON.stringify({ status })
    })
    revalidatePath('/admin/community/posts')
  }

  async function deletePost(formData: FormData) {
    'use server'
    const postId = String(formData.get('postId') || '')
    const baseUrl = resolveBaseUrl()
    const cookieHeader = cookies().toString()
    await fetch(`${baseUrl}/api/admin/community/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', cookie: cookieHeader }
    })
    revalidatePath('/admin/community/posts')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
            <p className="text-muted-foreground">
              Gerencie os posts da comunidade ({pagination.total} posts)
            </p>
          </div>
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
        communities={communities}
        topics={topics}
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
                <TableHead>Comunidade</TableHead>
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
                    <span className="text-sm">{post.community?.name || '—'}</span>
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
                          asChild
                        >
                          <form action={togglePin}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="pin" value={String(!post.isPinned)} />
                            <button type="submit" className="flex w-full items-center">
                              <Pin className="mr-2 h-4 w-4" />
                              {post.isPinned ? 'Desafixar' : 'Fixar'}
                            </button>
                          </form>
                        </DropdownMenuItem>
                        {post.status !== 'HIDDEN' ? (
                          <DropdownMenuItem asChild>
                            <form action={setStatus}>
                              <input type="hidden" name="postId" value={post.id} />
                              <input type="hidden" name="status" value="HIDDEN" />
                              <button type="submit" className="flex w-full items-center">
                                <EyeOff className="mr-2 h-4 w-4" />
                                Ocultar
                              </button>
                            </form>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem asChild>
                            <form action={setStatus}>
                              <input type="hidden" name="postId" value={post.id} />
                              <input type="hidden" name="status" value="PUBLISHED" />
                              <button type="submit" className="flex w-full items-center">
                                <Eye className="mr-2 h-4 w-4" />
                                Publicar
                              </button>
                            </form>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/posts/${post.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <form action={deletePost}>
                            <input type="hidden" name="postId" value={post.id} />
                            <button type="submit" className="text-red-600 flex w-full items-center">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </button>
                          </form>
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
