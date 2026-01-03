'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Search, MoreHorizontal, Edit, Trash2, Eye, Heart, Flag, MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Interfaces para tipagem
interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  post: {
    id: string
    title: string
    topic?: {
      id: string
      name: string
      color: string
    } | null
  }
  parentComment?: {
    id: string
    author: string
  } | null
  repliesCount: number
  reactionsCount: number
  reportsCount: number
  createdAt: string
}

interface CommentsResponse {
  comments: Comment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Função para buscar comentários da API
const getComments = async (filters?: {
  search?: string
  topic?: string
  type?: string
  reported?: string
  page?: number
  limit?: number
}): Promise<CommentsResponse> => {
  const params = new URLSearchParams()
  
  if (filters?.search) params.append('search', filters.search)
  if (filters?.topic && filters.topic !== 'all') params.append('topic', filters.topic)
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type)
  if (filters?.reported && filters.reported !== 'all') params.append('reported', filters.reported)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const response = await fetch(`/api/admin/community/comments?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Erro ao carregar comentários')
  }
  
  return response.json()
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

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    topic: 'all',
    type: 'all',
    reported: 'all'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  // Toast já importado do sonner

  // Função para carregar comentários
  const loadComments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getComments({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      })
      
      setComments(data.comments)
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  // Carregar comentários na inicialização e quando filtros mudarem
  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Função para aplicar filtros
  const handleFilter = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    loadComments()
  }

  // Função para deletar comentário
  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/admin/community/comments/${commentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erro ao deletar comentário')
      }
      
      toast.success('Comentário deletado com sucesso')
      
      // Recarregar comentários
      loadComments()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comentários</h1>
          <p className="text-muted-foreground">
            Gerencie os comentários da comunidade
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar comentários específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por conteúdo ou autor..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <Select value={filters.topic} onValueChange={(value) => setFilters(prev => ({ ...prev, topic: value }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="tarot">Tarot</SelectItem>
                <SelectItem value="astrologia">Astrologia</SelectItem>
                <SelectItem value="cristais">Cristais</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="comments">Comentários</SelectItem>
                <SelectItem value="replies">Respostas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.reported} onValueChange={(value) => setFilters(prev => ({ ...prev, reported: value }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Relatórios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="reported">Com relatórios</SelectItem>
                <SelectItem value="clean">Sem relatórios</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleFilter} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Comentários */}
      <Card>
        <CardHeader>
          <CardTitle>Comentários ({pagination.total})</CardTitle>
          <CardDescription>
            Lista de todos os comentários da comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando comentários...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadComments} variant="outline">
                Tentar novamente
              </Button>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum comentário encontrado</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comentário</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Engajamento</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell className="max-w-md">
                    <div className="space-y-2">
                      <p className="text-sm line-clamp-3">{comment.content}</p>
                      {comment.reportsCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <Flag className="mr-1 h-3 w-3" />
                          {comment.reportsCount} relatório{comment.reportsCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{comment.author.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {comment.author.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: comment.post.topic?.color || '#6B7280' }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {comment.post.topic?.name || 'Sem categoria'}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-1" title={comment.post.title}>
                        {comment.post.title}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {comment.parentComment ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          Resposta
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          para {comment.parentComment.author}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="default" className="text-xs">
                        Comentário
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {comment.repliesCount > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {comment.repliesCount}
                        </div>
                      )}
                      {comment.reactionsCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {comment.reactionsCount}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(comment.createdAt)}
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
                          <Link href={`/admin/community/comments/${comment.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/posts/${comment.post.id}`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Ver Post
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/community/comments/${comment.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este comentário?')) {
                              handleDelete(comment.id)
                            }
                          }}
                        >
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
          )}
          
          {/* Paginação */}
          {!loading && !error && comments.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} comentários
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
