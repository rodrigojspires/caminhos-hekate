'use client'

import React, { useState, useCallback } from 'react'
import { Search, Eye, ExternalLink, Clock, TrendingUp, Star, ChevronLeft, ChevronRight, Grid, List, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Tipos
interface SearchResult {
  id: string
  entityType: string
  entityId: string
  title: string
  content: string
  summary?: string
  tags?: string[]
  categories?: string[]
  metadata?: any
  popularity: number
  relevanceScore: number
  highlights?: {
    title?: string[]
    content?: string[]
    summary?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  totalPages: number
  facets?: {
    entityTypes: { value: string; count: number }[]
    categories: { value: string; count: number }[]
    tags: { value: string; count: number }[]
  }
  suggestions?: string[]
  searchTime: number
}

interface SearchResultsProps {
  results: SearchResponse
  onResultSelect?: (result: SearchResult) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  className?: string
  viewMode?: 'list' | 'grid'
  showExport?: boolean
}

// Ícones por tipo de entidade
const ENTITY_ICONS = {
  course: '📚',
  lesson: '🎓',
  post: '📝',
  topic: '💬',
  user: '👤',
  product: '🛍️'
}

// Cores por tipo de entidade
const ENTITY_COLORS = {
  course: 'bg-blue-100 text-blue-800',
  lesson: 'bg-green-100 text-green-800',
  post: 'bg-purple-100 text-purple-800',
  topic: 'bg-orange-100 text-orange-800',
  user: 'bg-gray-100 text-gray-800',
  product: 'bg-pink-100 text-pink-800'
}

export function SearchResults({
  results,
  onResultSelect,
  onPageChange,
  onLimitChange,
  className = '',
  viewMode: initialViewMode = 'list',
  showExport = false
}: SearchResultsProps) {
  // Estados
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(initialViewMode)
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  // Handlers
  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect?.(result)
  }, [onResultSelect])

  const handleSelectResult = useCallback((resultId: string, selected: boolean) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(resultId)
      } else {
        newSet.delete(resultId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedResults(new Set(results.results.map(r => r.id)))
    } else {
      setSelectedResults(new Set())
    }
  }, [results.results])

  const exportResults = useCallback(async () => {
    if (selectedResults.size === 0) return

    setIsExporting(true)
    try {
      const selectedData = results.results.filter(r => selectedResults.has(r.id))
      const csvContent = [
        ['Título', 'Tipo', 'Conteúdo', 'Tags', 'Categorias', 'Popularidade', 'Relevância', 'Data'].join(','),
        ...selectedData.map(result => [
          `"${result.title.replace(/"/g, '""')}"`,
          result.entityType,
          `"${result.content.substring(0, 100).replace(/"/g, '""')}..."`,
          `"${result.tags?.join('; ') || ''}"`,
          `"${result.categories?.join('; ') || ''}"`,
          result.popularity,
          result.relevanceScore.toFixed(2),
          new Date(result.createdAt).toLocaleDateString('pt-BR')
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `resultados-busca-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Erro ao exportar:', error)
    } finally {
      setIsExporting(false)
    }
  }, [selectedResults, results.results])

  // Renderizar highlight
  const renderHighlight = useCallback((text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) {
      return <span>{text}</span>
    }

    let highlightedText = text
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    })

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
  }, [])

  // Renderizar resultado individual
  const renderResult = useCallback((result: SearchResult, index: number) => {
    const entityIcon = ENTITY_ICONS[result.entityType as keyof typeof ENTITY_ICONS] || '📄'
    const entityColor = ENTITY_COLORS[result.entityType as keyof typeof ENTITY_COLORS] || 'bg-gray-100 text-gray-800'
    const isSelected = selectedResults.has(result.id)

    return (
      <Card 
        key={result.id} 
        className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleResultClick(result)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              {showExport && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleSelectResult(result.id, e.target.checked)
                  }}
                  className="rounded"
                />
              )}
              <Badge className={`${entityColor} text-xs`}>
                {entityIcon} {result.entityType}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-3 w-3" />
                <span>{result.relevanceScore.toFixed(1)}</span>
                <TrendingUp className="h-3 w-3 ml-2" />
                <span>{result.popularity}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true, locale: ptBR })}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight">
              {renderHighlight(result.title, result.highlights?.title)}
            </h3>
            
            {result.summary && (
              <p className="text-sm text-muted-foreground">
                {renderHighlight(result.summary, result.highlights?.summary)}
              </p>
            )}
            
            <p className="text-sm line-clamp-3">
              {renderHighlight(result.content.substring(0, 200) + '...', result.highlights?.content)}
            </p>
          </div>

          {(result.tags?.length || result.categories?.length) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {result.categories?.map(category => (
                <Badge key={category} variant="outline" className="text-xs">
                  📂 {category}
                </Badge>
              ))}
              {result.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  🏷️ {tag}
                </Badge>
              ))}
              {result.tags && result.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{result.tags.length - 3} mais
                </Badge>
              )}
            </div>
          )}

          {result.metadata && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {result.metadata.author && (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={result.metadata.author.avatar} />
                      <AvatarFallback className="text-xs">
                        {result.metadata.author.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{result.metadata.author.name}</span>
                  </div>
                )}
                {result.metadata.views && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{result.metadata.views} visualizações</span>
                  </div>
                )}
                {result.metadata.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{result.metadata.duration}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }, [selectedResults, showExport, handleResultClick, handleSelectResult, renderHighlight])

  // Renderizar paginação
  const renderPagination = useCallback(() => {
    const { page, totalPages } = results
    const maxVisiblePages = 5
    const startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, results.total)} de {results.total} resultados
          </span>
          <Select value={"20"} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">por página</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {pages.map(pageNum => (
            <Button
              key={pageNum}
              variant={pageNum === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="w-8 h-8 p-0"
            >
              {pageNum}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }, [results, onPageChange, onLimitChange])

  if (!results || results.results.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
          <p className="text-muted-foreground">
            Tente ajustar sua busca ou usar filtros diferentes.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header dos Resultados */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <strong>{results.total}</strong> resultados encontrados em <strong>{results.searchTime}ms</strong>
              </div>
              
              {showExport && selectedResults.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportResults}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exportando...' : `Exportar (${selectedResults.size})`}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showExport && (
                <div className="flex items-center gap-2 mr-4">
                  <input
                    type="checkbox"
                    checked={selectedResults.size === results.results.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Selecionar todos</span>
                </div>
              )}
              
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {results.results.map((result, index) => renderResult(result, index))}
      </div>

      {/* Paginação */}
      {results.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            {renderPagination()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}