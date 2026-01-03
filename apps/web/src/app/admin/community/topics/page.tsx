import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { headers, cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gerenciar Categorias - Comunidade',
  description: 'Gerencie as categorias da comunidade'
}

interface Topic {
  id: string
  name: string
  description: string
  color: string
  isActive: boolean
  postsCount: number
  community?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

interface CommunityOption {
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

// Função para buscar categorias
async function getTopics(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    const urlSearchParams = new URLSearchParams()
    
    // Construir parâmetros de busca
    if (searchParams.search) urlSearchParams.set('search', searchParams.search as string)
    if (searchParams.communityId && searchParams.communityId !== 'all') {
      urlSearchParams.set('communityId', searchParams.communityId as string)
    }
    if (searchParams.page) urlSearchParams.set('page', searchParams.page as string)
    if (searchParams.limit) urlSearchParams.set('limit', searchParams.limit as string)
    if (searchParams.sortBy) urlSearchParams.set('sortBy', searchParams.sortBy as string)
    if (searchParams.sortOrder) urlSearchParams.set('sortOrder', searchParams.sortOrder as string)

    const baseUrl = resolveBaseUrl()
    const headersList = headers()
    const response = await fetch(`${baseUrl}/api/admin/community/topics?${urlSearchParams.toString()}`, {
      cache: 'no-store',
      headers: {
        cookie: headersList.get('cookie') ?? ''
      }
    })

    if (!response.ok) {
      throw new Error('Erro ao buscar categorias')
    }

    const data = await response.json()
    
    // Mapear os dados da API para o formato esperado pelo componente
    const topics: Topic[] = data.topics.map((topic: any) => ({
      id: topic.id,
      name: topic.name,
      description: topic.description || '',
      color: topic.color || '#8B5CF6',
      isActive: typeof topic.isActive === 'boolean' ? topic.isActive : true,
      postsCount: topic._count?.posts || 0,
      community: topic.community ? { id: topic.community.id, name: topic.community.name } : null,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt
    }))

    return {
      topics,
      pagination: {
        ...data.pagination,
        totalPages: data.pagination?.pages ?? data.pagination?.totalPages ?? 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return {
      topics: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
    }
  }
}

async function getCommunities(): Promise<CommunityOption[]> {
  try {
    const baseUrl = resolveBaseUrl()
    const cookieHeader = cookies().toString()
    const response = await fetch(`${baseUrl}/api/admin/communities?limit=200&status=all`, {
      cache: 'no-store',
      headers: {
        cookie: cookieHeader
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const [topicsData, communities] = await Promise.all([
    getTopics(searchParams),
    getCommunities()
  ])
  const { topics, pagination } = topicsData
  const communityId = typeof searchParams.communityId === 'string' ? searchParams.communityId : null
  const backHref = communityId && communityId !== 'all'
    ? `/admin/community/communities/${communityId}`
    : '/admin/community'

  async function deleteTopic(topicId: string) {
    'use server'
    const cookieStore = cookies()
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ')
    await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/admin/community/topics/${topicId}`, {
      method: 'DELETE',
      headers: {
        cookie: cookieHeader
      }
    })
    revalidatePath('/admin/community/topics')
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
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias da comunidade
          </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/community/topics/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <TopicsFilters searchParams={searchParams} total={pagination.total} communities={communities} />

      {/* Tabela de Categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias ({topics.length})</CardTitle>
          <CardDescription>
            Lista de todas as categorias da comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Comunidade</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: topic.color }}
                      />
                      {topic.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate" title={topic.description}>
                      {topic.description}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{topic.community?.name || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: topic.color }}
                      />
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {topic.color}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={topic.isActive ? 'default' : 'secondary'}>
                      {topic.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {topic.postsCount} posts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(topic.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(topic.updatedAt)}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/topics/${topic.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/topics/${topic.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <form action={deleteTopic.bind(null, topic.id)}>
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
      <TopicsPagination searchParams={searchParams} pagination={pagination} />
    </div>
  )
}

// Componente de Filtros
function TopicsFilters({
  searchParams,
  total,
  communities
}: {
  searchParams: { [key: string]: string | string[] | undefined }
  total: number
  communities: CommunityOption[]
}) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>
          {total} categoria{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Buscar por nome ou descrição..."
                defaultValue={search}
                className="pl-8"
              />
            </div>
          </div>
          <Select
            name="communityId"
            defaultValue={typeof searchParams.communityId === 'string' ? searchParams.communityId : 'all'}
          >
            <SelectTrigger className="w-[220px]">
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
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Componente de Paginação
function TopicsPagination({
  searchParams,
  pagination,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}) {
  const { page, totalPages } = pagination
  
  // Criar URL com parâmetros de busca preservados
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams()
    
    // Preservar parâmetros existentes
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && value) {
        params.set(key, Array.isArray(value) ? value[0] : value)
      }
    })
    
    // Adicionar nova página
    if (pageNumber > 1) {
      params.set('page', pageNumber.toString())
    }
    
    return params.toString() ? `?${params.toString()}` : ''
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      
      <div className="flex items-center space-x-2">
        {/* Página anterior */}
        {page > 1 && (
          <Button variant="outline" size="sm" asChild>
            <Link href={createPageUrl(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          </Button>
        )}
        
        {/* Números das páginas */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber
            if (totalPages <= 5) {
              pageNumber = i + 1
            } else if (page <= 3) {
              pageNumber = i + 1
            } else if (page >= totalPages - 2) {
              pageNumber = totalPages - 4 + i
            } else {
              pageNumber = page - 2 + i
            }
            
            return (
              <Button
                key={pageNumber}
                variant={page === pageNumber ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href={createPageUrl(pageNumber)}>
                  {pageNumber}
                </Link>
              </Button>
            )
          })}
        </div>
        
        {/* Próxima página */}
        {page < totalPages && (
          <Button variant="outline" size="sm" asChild>
            <Link href={createPageUrl(page + 1)}>
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
