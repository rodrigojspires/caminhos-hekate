'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  AlertCircle,
  Copy,
  Edit,
  Eye,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  variables: string[]
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  updatedBy: {
    name: string
  }
  usageCount: number
}

interface EmailTemplateStats {
  total: number
  active: number
  system: number
  totalUsage: number
}

interface EmailTemplateResponse {
  templates: EmailTemplate[]
  stats: EmailTemplateStats
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
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

function getTemplateTypeBadge(isSystem: boolean) {
  if (isSystem) {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-600">
        <Settings className="mr-1 h-3 w-3" />
        Sistema
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-green-600 border-green-600">
      <Edit className="mr-1 h-3 w-3" />
      Personalizado
    </Badge>
  )
}

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600">
        Ativo
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-gray-600 border-gray-600">
      Inativo
    </Badge>
  )
}

export default function EmailTemplatesPage() {
  const [data, setData] = useState<EmailTemplateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      
      const response = await fetch(`/api/admin/email-templates?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar templates')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Erro ao buscar templates:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      toast.error('Erro ao carregar templates de email')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, statusFilter, typeFilter])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchTemplates()
  }

  const handleRefresh = () => {
    fetchTemplates()
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Erro ao carregar templates</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const templates = data?.templates || []
  const stats = data?.stats || { total: 0, active: 0, system: 0, totalUsage: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Templates de E-mail</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de E-mail</h1>
          <p className="text-muted-foreground">
            Gerencie os templates de e-mail do sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/settings/email/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Link>
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Templates</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates Ativos</CardTitle>
            <Send className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates do Sistema</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.system}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar templates específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou assunto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
          <CardDescription>
            Lista de todos os templates de e-mail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Nenhum template corresponde aos filtros aplicados.'
                  : 'Ainda não há templates de email cadastrados.'}
              </p>
              <Button onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
                setCurrentPage(1)
              }} variant="outline">
                Limpar filtros
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {template.name}
                          </code>
                          {template.isSystem && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Não editável
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm line-clamp-2" title={template.subject}>
                        {template.subject}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                        {template.variables.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTemplateTypeBadge(template.isSystem)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(template.isActive)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.usageCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <p>{formatDate(template.updatedAt)}</p>
                        <p className="text-xs">por {template.updatedBy.name}</p>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/settings/email/${template.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/settings/email/${template.id}/preview`}>
                              <Mail className="mr-2 h-4 w-4" />
                              Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!template.isSystem && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/settings/email/${template.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}