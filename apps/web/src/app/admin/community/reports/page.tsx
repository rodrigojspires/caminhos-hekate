import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { revalidatePath } from 'next/cache'
import { headers, cookies } from 'next/headers'
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
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle, AlertTriangle, MessageSquare, FileText, ChevronLeft, ChevronRight, Users, Heart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gerenciar Relatórios - Comunidade',
  description: 'Gerencie os relatórios da comunidade'
}

interface Report {
  id: string
  type: 'SPAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'MISINFORMATION' | 'OTHER'
  reason: string
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
  reporter: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  reportedContent: {
    id: string
    type: 'POST' | 'COMMENT'
    title?: string
    content: string
    author: {
      name: string
      email: string
    }
    topic?: {
      name: string
      color: string
    }
  }
  createdAt: string
  resolvedAt?: string
  resolvedBy?: {
    name: string
  }
}

interface ReportsResponse {
  reports: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

function resolveBaseUrl() {
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  return envBaseUrl || (host ? `${proto}://${host}` : 'http://localhost:3000')
}

// Função para buscar relatórios da API
async function getReports(searchParams?: {
  search?: string
  status?: string
  type?: string
  page?: string
  limit?: string
}): Promise<{ reports: Report[], pagination: ReportsResponse['pagination'] }> {
  try {
    const params = new URLSearchParams()
    
    if (searchParams?.search) params.set('search', searchParams.search)
    if (searchParams?.status) params.set('status', searchParams.status)
    if (searchParams?.type) params.set('type', searchParams.type)
    if (searchParams?.page) params.set('page', searchParams.page)
    if (searchParams?.limit) params.set('limit', searchParams.limit)
    
    const baseUrl = resolveBaseUrl()
    const headersList = headers()
    const response = await fetch(`${baseUrl}/api/admin/community/reports?${params}`, {
      cache: 'no-store',
      headers: {
        cookie: headersList.get('cookie') ?? ''
      }
    })
    
    if (!response.ok) {
      throw new Error('Falha ao buscar relatórios')
    }
    
    const data: ReportsResponse = await response.json()
    
    // Mapear dados da API para o formato esperado pelo componente
    const mappedReports: Report[] = data.reports.map((report: any) => ({
      id: report.id,
      type: report.type,
      reason: report.reason,
      status: report.status,
      reporter: {
        id: report.reporter.id,
        name: report.reporter.name,
        email: report.reporter.email,
        avatar: report.reporter.image
      },
      reportedContent: {
        id: report.post?.id || report.comment?.id || '',
        type: report.post ? 'POST' : 'COMMENT',
        title: report.post?.title,
        content: report.post?.content || report.comment?.content || '',
        author: {
          id: report.post?.author?.id || report.comment?.author?.id || '',
          name: report.post?.author?.name || report.comment?.author?.name || '',
          email: report.post?.author?.email || report.comment?.author?.email || '',
          avatar: undefined
        },
        topic: report.post?.topic ? {
          id: report.post.topic.id,
          name: report.post.topic.name,
          color: report.post.topic.color || '#6B7280'
        } : {
          id: '',
          name: 'N/A',
          color: '#6B7280'
        }
      },
      createdAt: report.createdAt,
      resolvedAt: report.reviewedAt,
      resolvedBy: report.reviewer ? {
        name: report.reviewer.name
      } : undefined
    }))
    
    return {
      reports: mappedReports,
      pagination: data.pagination
    }
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
    return {
      reports: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      }
    }
  }
}

async function getInsights() {
  const baseUrl = resolveBaseUrl()
  const headersList = headers()
  const authHeaders = { cookie: headersList.get('cookie') ?? '' }

  const [communitiesRes, postsRes, topicsRes, commentsRes] = await Promise.all([
    fetch(`${baseUrl}/api/admin/communities?limit=200&status=all`, { cache: 'no-store', headers: authHeaders }),
    fetch(`${baseUrl}/api/admin/community/posts?limit=200&status=PUBLISHED`, { cache: 'no-store', headers: authHeaders }),
    fetch(`${baseUrl}/api/admin/community/topics?limit=200`, { cache: 'no-store', headers: authHeaders }),
    fetch(`${baseUrl}/api/admin/community/comments?limit=200`, { cache: 'no-store', headers: authHeaders })
  ])

  const communitiesData = communitiesRes.ok ? await communitiesRes.json() : { communities: [] }
  const postsData = postsRes.ok ? await postsRes.json() : { posts: [], pagination: { total: 0 } }
  const topicsData = topicsRes.ok ? await topicsRes.json() : { topics: [], pagination: { total: 0 } }
  const commentsData = commentsRes.ok ? await commentsRes.json() : { comments: [], pagination: { total: 0 } }

  const communities = Array.isArray(communitiesData?.communities) ? communitiesData.communities : []
  const posts = Array.isArray(postsData?.posts) ? postsData.posts : []
  const topics = Array.isArray(topicsData?.topics) ? topicsData.topics : []
  const comments = Array.isArray(commentsData?.comments) ? commentsData.comments : []

  const totalMembers = communities.reduce((sum: number, community: any) => sum + (community.membersCount || 0), 0)

  const authorActivity = new Map<string, { name: string; count: number }>()
  for (const post of posts) {
    const authorId = post.author?.id
    if (!authorId) continue
    const entry = authorActivity.get(authorId) || { name: post.author?.name || 'Usuário', count: 0 }
    entry.count += 1
    authorActivity.set(authorId, entry)
  }
  for (const comment of comments) {
    const authorId = comment.author?.id
    if (!authorId) continue
    const entry = authorActivity.get(authorId) || { name: comment.author?.name || 'Usuário', count: 0 }
    entry.count += 1
    authorActivity.set(authorId, entry)
  }
  const topMembers = Array.from(authorActivity.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const topPosts = posts
    .map((post: any) => ({
      id: post.id,
      title: post.title || 'Sem título',
      engagement: (post._count?.comments || 0) + (post._count?.reactions || 0)
    }))
    .sort((a: any, b: any) => b.engagement - a.engagement)
    .slice(0, 3)

  const topTopics = topics
    .map((topic: any) => ({
      id: topic.id,
      name: topic.name || 'Categoria',
      posts: topic._count?.posts || 0
    }))
    .sort((a: any, b: any) => b.posts - a.posts)
    .slice(0, 3)

  return {
    communitiesCount: communities.length,
    totalMembers,
    totalPosts: postsData?.pagination?.total ?? posts.length,
    totalTopics: topicsData?.pagination?.total ?? topics.length,
    topMembers,
    topPosts,
    topTopics
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getTypeLabel(type: string) {
  const types = {
    SPAM: 'Spam',
    INAPPROPRIATE: 'Inadequado',
    HARASSMENT: 'Assédio',
    MISINFORMATION: 'Desinformação',
    OTHER: 'Outro'
  }
  return types[type as keyof typeof types] || type
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Pendente
        </Badge>
      )
    case 'RESOLVED':
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Resolvido
        </Badge>
      )
    case 'DISMISSED':
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-600">
          <XCircle className="mr-1 h-3 w-3" />
          Rejeitado
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

async function handleResolveReport(reportId: string) {
  'use server'
  try {
    const baseUrl = resolveBaseUrl()
    const cookieHeader = cookies().toString()
    const response = await fetch(`${baseUrl}/api/admin/community/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolution: 'Relatório resolvido pelo administrador'
      })
    })

    if (!response.ok) {
      throw new Error('Erro ao resolver relatório')
    }

    // Revalidar a página para mostrar as mudanças
    revalidatePath('/admin/community/reports')
  } catch (error) {
    console.error('Erro ao resolver relatório:', error)
  }
}

async function handleDismissReport(reportId: string) {
  'use server'
  try {
    const baseUrl = resolveBaseUrl()
    const cookieHeader = cookies().toString()
    const response = await fetch(`${baseUrl}/api/admin/community/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader
      },
      body: JSON.stringify({
        status: 'DISMISSED',
        resolution: 'Relatório rejeitado pelo administrador'
      })
    })

    if (!response.ok) {
      throw new Error('Erro ao rejeitar relatório')
    }

    // Revalidar a página para mostrar as mudanças
    revalidatePath('/admin/community/reports')
  } catch (error) {
    console.error('Erro ao rejeitar relatório:', error)
  }
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: {
    search?: string
    status?: string
    type?: string
    page?: string
    limit?: string
  }
}) {
  const [reportsData, insights] = await Promise.all([
    getReports(searchParams),
    getInsights()
  ])
  const { reports, pagination } = reportsData
  const pendingReports = reports.filter(r => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Gerencie os relatórios da comunidade
          </p>
        </div>
        {pendingReports > 0 && (
          <Badge variant="destructive" className="text-sm">
            {pendingReports} pendente{pendingReports > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Visão geral da comunidade */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comunidades</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.communitiesCount}</div>
            <p className="text-xs text-muted-foreground">Total cadastradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Participantes ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts publicados</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalPosts}</div>
            <p className="text-xs text-muted-foreground">Últimos posts ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias ativas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.topTopics.length ? (
              insights.topTopics.map((topic: any) => (
                <p key={topic.id} className="text-xs text-muted-foreground">
                  {topic.name} • {topic.posts}
                </p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados recentes</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros mais ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.topMembers.length ? (
              insights.topMembers.map((member: any) => (
                <p key={member.name} className="text-xs text-muted-foreground">
                  {member.name} • {member.count}
                </p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados recentes</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts populares</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.topPosts.length ? (
              insights.topPosts.map((post: any) => (
                <p key={post.id} className="text-xs text-muted-foreground">
                  {post.title} • {post.engagement}
                </p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados recentes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
          <CardDescription>Atalhos para tarefas frequentes</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Button asChild variant="outline">
            <Link href="/admin/community/communities">Gerenciar comunidades</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/community/posts/new">Criar novo post</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/community/topics/new">Nova categoria</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/community/posts">Ver posts</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/community/comments">Moderar comentários</Link>
          </Button>
        </CardContent>
      </Card>

      <ReportsFilters searchParams={searchParams} total={pagination.total} />

      {/* Tabela de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios ({reports.length})</CardTitle>
          <CardDescription>
            Lista de todos os relatórios da comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Relatório</TableHead>
                <TableHead>Conteúdo Reportado</TableHead>
                <TableHead>Reportado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(report.type)}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2">{report.reason}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {report.reportedContent.type === 'POST' ? (
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <FileText className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {report.reportedContent.type === 'POST' ? 'Post' : 'Comentário'}
                        </span>
                        {report.reportedContent.topic && (
                          <>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: report.reportedContent.topic.color }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {report.reportedContent.topic.name}
                            </span>
                          </>
                        )}
                      </div>
                      {report.reportedContent.title && (
                        <p className="text-sm font-medium line-clamp-1">
                          {report.reportedContent.title}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.reportedContent.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        por {report.reportedContent.author.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={report.reporter.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(report.reporter.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{report.reporter.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.reporter.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(report.status)}
                      {report.resolvedAt && (
                        <p className="text-xs text-muted-foreground">
                          por {report.resolvedBy?.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>{formatDate(report.createdAt)}</p>
                      {report.resolvedAt && (
                        <p className="text-xs">
                          Resolvido: {formatDate(report.resolvedAt)}
                        </p>
                      )}
                    </div>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver relatório
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {report.reportedContent.type === 'POST' ? (
                            <FileText className="mr-2 h-4 w-4" />
                          ) : (
                            <MessageSquare className="mr-2 h-4 w-4" />
                          )}
                          Ver conteúdo reportado
                        </DropdownMenuItem>
                        {report.status === 'PENDING' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <form action={handleResolveReport.bind(null, report.id)}>
                                <button type="submit" className="text-green-600 flex w-full items-center">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Resolver relatório
                                </button>
                              </form>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <form action={handleDismissReport.bind(null, report.id)}>
                                <button type="submit" className="text-red-600 flex w-full items-center">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Rejeitar relatório
                                </button>
                              </form>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReportsPagination pagination={pagination} searchParams={searchParams} />
    </div>
  )
}

// Componente de Filtros
function ReportsFilters({ searchParams, total }: {
  searchParams?: {
    search?: string
    status?: string
    type?: string
    page?: string
    limit?: string
  }
  total: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>
          {total} relatório{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por motivo ou conteúdo..."
                className="pl-8"
                defaultValue={searchParams?.search || ''}
              />
            </div>
          </div>
          <Select defaultValue={searchParams?.status || 'all'}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="RESOLVED">Resolvido</SelectItem>
              <SelectItem value="DISMISSED">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue={searchParams?.type || 'all'}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="SPAM">Spam</SelectItem>
              <SelectItem value="INAPPROPRIATE">Inadequado</SelectItem>
              <SelectItem value="HARASSMENT">Assédio</SelectItem>
              <SelectItem value="MISINFORMATION">Desinformação</SelectItem>
              <SelectItem value="OTHER">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente de Paginação
function ReportsPagination({ pagination, searchParams }: {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  searchParams?: {
    search?: string
    status?: string
    type?: string
    page?: string
    limit?: string
  }
}) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams?.search) params.set('search', searchParams.search)
    if (searchParams?.status) params.set('status', searchParams.status)
    if (searchParams?.type) params.set('type', searchParams.type)
    if (searchParams?.limit) params.set('limit', searchParams.limit)
    params.set('page', page.toString())
    return `?${params.toString()}`
  }

  if (pagination.pages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} relatórios
      </p>
      <div className="flex items-center space-x-2">
        {pagination.page > 1 && (
          <Link href={createPageUrl(pagination.page - 1)}>
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
          </Link>
        )}
        
        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
          const page = i + 1
          return (
            <Link key={page} href={createPageUrl(page)}>
              <Button
                variant={page === pagination.page ? "default" : "outline"}
                size="sm"
              >
                {page}
              </Button>
            </Link>
          )
        })}
        
        {pagination.page < pagination.pages && (
          <Link href={createPageUrl(pagination.page + 1)}>
            <Button variant="outline" size="sm">
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
