import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { revalidatePath } from 'next/cache'
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
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle, AlertTriangle, MessageSquare, FileText, Shield, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react'

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
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/community/reports?${params}`, {
      cache: 'no-store'
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/community/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/community/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
  const { reports, pagination } = await getReports(searchParams)
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

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Relatórios</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'RESOLVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

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
                            <DropdownMenuItem 
                              className="text-green-600"
                              onClick={() => handleResolveReport(report.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Resolver relatório
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDismissReport(report.id)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Rejeitar relatório
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