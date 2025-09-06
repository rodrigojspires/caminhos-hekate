// Componentes de Busca
export { AdvancedSearch } from './AdvancedSearch'
export { SearchFilters } from './SearchFilters'
export { SearchResults } from './SearchResults'

// Tipos
export interface SearchFilters {
  entityTypes: string[]
  categories: string[]
  tags: string[]
  dateRange: {
    start?: Date
    end?: Date
  }
  popularity: {
    min?: number
    max?: number
  }
  customFilters: Record<string, any>
}

export interface SearchResult {
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

export interface SearchResponse {
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

export interface SearchSuggestion {
  id: string
  query: string
  entityType?: string
  category?: string
  popularity: number
  createdAt: Date
  updatedAt: Date
}

export interface SearchFacet {
  id: string
  entityType?: string
  category?: string
  tag?: string
  dateRange?: {
    start: Date
    end: Date
  }
  popularity?: {
    min: number
    max: number
  }
  count: number
  createdAt: Date
  updatedAt: Date
}