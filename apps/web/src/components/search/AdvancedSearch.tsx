'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Filter, X, Calendar, Tag, Layers, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { DatePicker } from '@/components/ui/date-picker'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import { toast } from 'sonner'

// Tipos
interface SearchFilters {
  entityTypes?: string[]
  categories?: string[]
  tags?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  popularity?: {
    min: number
    max: number
  }
}

interface SearchOptions {
  page: number
  limit: number
  sortBy: 'relevance' | 'popularity' | 'date' | 'title'
  sortOrder: 'asc' | 'desc'
  facets: boolean
  highlight: boolean
}

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

interface AdvancedSearchProps {
  className?: string
  onResultSelect?: (result: SearchResult) => void
  defaultQuery?: string
  defaultFilters?: SearchFilters
  showFilters?: boolean
  showSuggestions?: boolean
  maxResults?: number
}

export function AdvancedSearch({
  className = '',
  onResultSelect,
  defaultQuery = '',
  defaultFilters = {},
  showFilters = true,
  showSuggestions = true,
  maxResults = 20
}: AdvancedSearchProps) {
  // Estados
  const [query, setQuery] = useState(defaultQuery)
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters)
  const [options, setOptions] = useState<SearchOptions>({
    page: 1,
    limit: maxResults,
    sortBy: 'relevance',
    sortOrder: 'desc',
    facets: true,
    highlight: true
  })
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Carregar histórico do localStorage
  useEffect(() => {
    const history = localStorage.getItem('search-history')
    if (history) {
      setSearchHistory(JSON.parse(history))
    }
  }, [])

  // Salvar no histórico
  const saveToHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('search-history', JSON.stringify(newHistory))
  }, [searchHistory])

  // Buscar sugestões
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '5'
      })

      if (filters.entityTypes?.length) {
        params.append('entityTypes', filters.entityTypes.join(','))
      }
      if (filters.categories?.length) {
        params.append('categories', filters.categories.join(','))
      }

      const response = await fetch(`/api/search/suggestions?${params}`)
      const data = await response.json()

      if (data.success) {
        setSuggestions(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [filters.entityTypes, filters.categories])

  // Debounce para sugestões
  useEffect(() => {
    if (!showSuggestions) return
    
    const timer = setTimeout(() => {
      fetchSuggestions(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, fetchSuggestions, showSuggestions])

  // Executar busca
  const executeSearch = useCallback(async (searchQuery: string = query, searchFilters: SearchFilters = filters, searchOptions: SearchOptions = options) => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: searchOptions.page.toString(),
        limit: searchOptions.limit.toString(),
        sortBy: searchOptions.sortBy,
        sortOrder: searchOptions.sortOrder,
        facets: searchOptions.facets.toString(),
        highlight: searchOptions.highlight.toString()
      })

      // Adicionar filtros
      if (searchFilters.entityTypes?.length) {
        params.append('entityTypes', searchFilters.entityTypes.join(','))
      }
      if (searchFilters.categories?.length) {
        params.append('categories', searchFilters.categories.join(','))
      }
      if (searchFilters.tags?.length) {
        params.append('tags', searchFilters.tags.join(','))
      }
      if (searchFilters.dateRange) {
        params.append('dateFrom', searchFilters.dateRange.from.toISOString())
        params.append('dateTo', searchFilters.dateRange.to.toISOString())
      }
      if (searchFilters.popularity) {
        params.append('popularityMin', searchFilters.popularity.min.toString())
        params.append('popularityMax', searchFilters.popularity.max.toString())
      }

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        saveToHistory(searchQuery)
        setSuggestions([])
      } else {
        toast.error(data.error || 'Erro na busca')
      }
    } catch (error) {
      console.error('Erro na busca:', error)
      toast.error('Erro ao executar busca')
    } finally {
      setIsLoading(false)
    }
  }, [query, filters, options, saveToHistory])

  // Handlers
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    executeSearch()
  }, [executeSearch])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion)
    setSuggestions([])
    executeSearch(suggestion)
  }, [executeSearch])

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
    if (query.trim()) {
      executeSearch(query, newFilters)
    }
  }, [query, executeSearch])

  const handleOptionsChange = useCallback((newOptions: Partial<SearchOptions>) => {
    const updatedOptions = { ...options, ...newOptions }
    setOptions(updatedOptions)
    if (query.trim()) {
      executeSearch(query, filters, updatedOptions)
    }
  }, [query, filters, options, executeSearch])

  const clearFilters = useCallback(() => {
    setFilters({})
    if (query.trim()) {
      executeSearch(query, {})
    }
  }, [query, executeSearch])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults(null)
    setSuggestions([])
  }, [])

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.entityTypes?.length) count++
    if (filters.categories?.length) count++
    if (filters.tags?.length) count++
    if (filters.dateRange) count++
    if (filters.popularity) count++
    return count
  }, [filters])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Barra de Busca */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Digite sua busca..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Sugestões */}
              {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute top-full left-0 right-0 z-50 mt-1">
                  <CardContent className="p-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isLoading || !query.trim()}>
                  {isLoading ? 'Buscando...' : 'Buscar'}
                </Button>

                {showFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="relative"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                )}

                {activeFiltersCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>

              {/* Opções de Ordenação */}
              <div className="flex items-center gap-2">
                <Select
                  value={options.sortBy}
                  onValueChange={(value: any) => handleOptionsChange({ sortBy: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="popularity">Popularidade</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="title">Título</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={options.sortOrder}
                  onValueChange={(value: any) => handleOptionsChange({ sortOrder: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Asc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          {/* Histórico de Busca */}
          {searchHistory.length > 0 && !query && (
            <div className="mt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Buscas Recentes</Label>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 5).map((historyItem, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => {
                      setQuery(historyItem)
                      executeSearch(historyItem)
                    }}
                  >
                    {historyItem}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros Avançados */}
      {showFilters && showAdvancedFilters && (
        <SearchFilters
          filters={filters}
          onChange={handleFilterChange}
          facets={results?.facets}
        />
      )}

      {/* Resultados */}
      {results && (
        <SearchResults
          results={results}
          onResultSelect={onResultSelect}
          onPageChange={(page) => handleOptionsChange({ page })}
          onLimitChange={(limit) => handleOptionsChange({ limit, page: 1 })}
        />
      )}
    </div>
  )
}