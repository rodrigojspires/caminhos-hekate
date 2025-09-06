'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  Send,
  Filter,
  Download,
  Upload
} from 'lucide-react'
import type { EmailTemplate, EmailCategory as EmailTemplateCategory, EmailTemplateStatus } from '@/lib/email'

interface EmailTemplateListProps {
  templates: EmailTemplate[]
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading?: boolean
  onSearch?: (searchTerm: string) => void
  onFilterChange?: (filters: TemplateFilters) => void
  onPageChange?: (page: number) => void
  onFilter?: (filters: TemplateFilters) => void
  onEdit?: (template: EmailTemplate) => void
  onDuplicate?: (template: EmailTemplate) => void
  onDelete?: (templateId: string) => void
  onPreview?: (template: EmailTemplate) => void
  onSendTest?: (template: EmailTemplate, testEmail: string) => void
  onCreate?: () => void
  onExport?: () => void
  onImport?: (file: File) => void
}

interface TemplateFilters {
  category?: EmailTemplateCategory
  status?: EmailTemplateStatus
  isActive?: boolean
  tags?: string[]
}

export function EmailTemplateList({
  templates,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onSearch,
  onFilter,
  onFilterChange,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
  onSendTest,
  onCreate,
  onExport,
  onImport
}: EmailTemplateListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TemplateFilters>({})
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, onSearch])

  // Apply filters
  useEffect(() => {
    onFilter?.(filters)
    onFilterChange?.(filters)
  }, [filters, onFilter, onFilterChange])

  const handleFilterChange = (key: keyof TemplateFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
  }

  const handleDelete = (templateId: string) => {
    onDelete?.(templateId)
    setDeleteTemplateId(null)
    toast.success('Template deletado com sucesso')
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImport?.(file)
      event.target.value = '' // Reset input
    }
  }

  const getStatusBadge = (status: EmailTemplateStatus) => {
    const variants: Record<EmailTemplateStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
      DRAFT: 'secondary',
      ACTIVE: 'default',
      ARCHIVED: 'outline',
      TESTING: 'default'
    }

    const labels: Record<EmailTemplateStatus, string> = {
      DRAFT: 'Rascunho',
      ACTIVE: 'Ativo',
      ARCHIVED: 'Arquivado',
      TESTING: 'Teste'
    }

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const getCategoryBadge = (category: EmailTemplateCategory) => {
    const colors: Partial<Record<EmailTemplateCategory, string>> = {
      TRANSACTIONAL: 'bg-blue-100 text-blue-800',
      MARKETING: 'bg-green-100 text-green-800',
      NOTIFICATION: 'bg-yellow-100 text-yellow-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
      WELCOME: 'bg-purple-100 text-purple-800',
      CONFIRMATION: 'bg-teal-100 text-teal-800',
      REMINDER: 'bg-orange-100 text-orange-800',
      NEWSLETTER: 'bg-indigo-100 text-indigo-800'
    }

    const labels: Partial<Record<EmailTemplateCategory, string>> = {
      TRANSACTIONAL: 'Transacional',
      MARKETING: 'Marketing',
      NOTIFICATION: 'Notificação',
      SYSTEM: 'Sistema',
      WELCOME: 'Boas-vindas',
      CONFIRMATION: 'Confirmação',
      REMINDER: 'Lembrete',
      NEWSLETTER: 'Newsletter'
    }

    return (
      <Badge className={colors[category] || 'bg-gray-100 text-gray-800'}>
        {labels[category] || category}
      </Badge>
    )
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates de Email</h2>
          <p className="text-muted-foreground">
            Gerencie seus templates de email
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="TRANSACTIONAL">Transacional</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="NOTIFICATION">Notificação</SelectItem>
                    <SelectItem value="SYSTEM">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="ARCHIVED">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
                  onValueChange={(value) => handleFilterChange('isActive', value === 'all' ? undefined : value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando templates...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Nenhum template encontrado
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => {
                  const isActive = (template.status as any) === 'ACTIVE' || (template.status as any) === 'PUBLISHED'
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.slug}</div>
                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {template.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {template.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(template.category as unknown as EmailTemplateCategory)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(template.status as unknown as EmailTemplateStatus)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(template.createdAt as any).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {new Date(template.updatedAt as any).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onPreview?.(template)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const email = window.prompt('Digite o email de teste:')
                              if (email && onSendTest) onSendTest(template, email)
                            }}>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar Teste
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteTemplateId(template.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} templates
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange?.(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && handleDelete(deleteTemplateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
