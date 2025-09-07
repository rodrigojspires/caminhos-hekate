import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import Redis from 'ioredis'

const prisma = new PrismaClient()
let _redis: Redis | null = null
function getRedis(): Redis | null {
  try {
    if (_redis) return _redis
    if (!process.env.REDIS_URL) return null
    _redis = new Redis(process.env.REDIS_URL)
    return _redis
  } catch {
    return null
  }
}

// Interfaces
export interface SearchResult {
  id: string
  entityType: string
  entityId: string
  title: string
  content: string
  summary?: string
  tags: string[]
  categories: string[]
  metadata?: any
  popularity: number
  relevance: number
  score?: number
}

export interface SearchFilters {
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
  customFilters?: Record<string, any>
}

export interface SearchOptions {
  page?: number
  limit?: number
  sortBy?: 'relevance' | 'popularity' | 'date' | 'title'
  sortOrder?: 'asc' | 'desc'
  facets?: boolean
  highlight?: boolean
}

export interface SearchFacet {
  name: string
  type: string
  values: Array<{
    value: string
    count: number
    selected?: boolean
  }>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  limit: number
  facets?: SearchFacet[]
  suggestions?: string[]
  executionTime: number
}

export interface SearchSuggestion {
  query: string
  suggestion: string
  category?: string
  popularity: number
}

class SearchService {
  private cachePrefix = 'search:'
  private cacheTTL = 300 // 5 minutos

  // Busca principal
  async search(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(query, filters, options)
    
    // Verificar cache
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return {
        ...cached,
        executionTime: Date.now() - startTime
      }
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      facets = false,
      highlight = false
    } = options

    const offset = (page - 1) * limit

    // Construir query do Prisma
    const whereClause = this.buildWhereClause(query, filters)
    const orderByClause = this.buildOrderByClause(sortBy, sortOrder)

    // Executar busca
    const [results, total] = await Promise.all([
      prisma.searchIndex.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip: offset,
        take: limit
      }),
      prisma.searchIndex.count({ where: whereClause })
    ])

    // Calcular relevância e score
    const processedResults = this.processResults(results, query, highlight)

    // Obter facetas se solicitado
    const searchFacets = facets ? await this.getFacets(whereClause) : undefined

    // Obter sugestões
    const suggestions = await this.getSuggestions(query)

    const response: SearchResponse = {
      results: processedResults,
      total,
      page,
      limit,
      facets: searchFacets,
      suggestions,
      executionTime: Date.now() - startTime
    }

    // Salvar no cache
    await this.saveToCache(cacheKey, response)

    // Registrar query para analytics
    await this.logSearchQuery(query, filters, total)

    return response
  }

  // Busca por sugestões
  async getSearchSuggestions(query: string, limit = 10): Promise<SearchSuggestion[]> {
    const cacheKey = `${this.cachePrefix}suggestions:${query}`
    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    const rows = await prisma.searchSuggestion.findMany({
      where: {
        OR: [
          { query: { contains: query, mode: 'insensitive' } },
          { suggestion: { contains: query, mode: 'insensitive' } }
        ],
        isActive: true
      },
      orderBy: { popularity: 'desc' },
      take: limit,
      select: { query: true, suggestion: true, category: true, popularity: true }
    })

    const suggestions: SearchSuggestion[] = rows.map(r => ({
      query: r.query,
      suggestion: r.suggestion,
      category: r.category ?? undefined,
      popularity: r.popularity
    }))

    await this.saveToCache(cacheKey, suggestions, 600) // 10 minutos
    return suggestions
  }

  // Indexar conteúdo
  async indexContent(
    entityType: string,
    entityId: string,
    data: {
      title: string
      content: string
      summary?: string
      tags?: string[]
      categories?: string[]
      metadata?: any
      popularity?: number
    }
  ): Promise<void> {
    const searchVector = this.generateSearchVector(data.title, data.content)

    const existing = await prisma.searchIndex.findFirst({
      where: { entityType, entityId }
    })

    if (existing) {
      await prisma.searchIndex.updateMany({
        where: { entityType, entityId },
        data: {
          title: data.title,
          content: data.content,
          summary: data.summary,
          tags: data.tags || [],
          categories: data.categories || [],
          metadata: data.metadata,
          searchVector,
          popularity: data.popularity || 0,
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.searchIndex.create({
        data: {
          entityType,
          entityId,
          title: data.title,
          content: data.content,
          summary: data.summary,
          tags: data.tags || [],
          categories: data.categories || [],
          metadata: data.metadata,
          searchVector,
          popularity: data.popularity || 0,
          relevance: 0
        }
      })
    }

    // Limpar cache relacionado
    await this.clearSearchCache()
  }

  // Remover do índice
  async removeFromIndex(entityType: string, entityId: string): Promise<void> {
    await prisma.searchIndex.updateMany({
      where: { entityType, entityId },
      data: { isActive: false }
    })

    await this.clearSearchCache()
  }

  // Atualizar popularidade
  async updatePopularity(entityType: string, entityId: string, increment = 1): Promise<void> {
    await prisma.searchIndex.updateMany({
      where: { entityType, entityId },
      data: {
        popularity: {
          increment
        }
      }
    })
  }

  // Gerenciar sugestões
  async addSuggestion(query: string, suggestion: string, category?: string): Promise<void> {
    await prisma.searchSuggestion.upsert({
      where: { query },
      create: {
        query,
        suggestion,
        category,
        popularity: 1
      },
      update: {
        suggestion,
        category,
        popularity: {
          increment: 1
        }
      }
    })
  }

  // Obter facetas ativas
  async getActiveFacets(): Promise<SearchFacet[]> {
    const cacheKey = `${this.cachePrefix}facets:active`
    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    const facets = await prisma.searchFacet.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    const processedFacets = facets.map(facet => ({
      name: facet.name,
      type: facet.type,
      values: Array.isArray(facet.values) ? facet.values.map((value: any) => ({
        value: value.toString(),
        count: 0
      })) : []
    }))

    await this.saveToCache(cacheKey, processedFacets, 1800) // 30 minutos
    return processedFacets
  }

  // Métodos privados
  private buildWhereClause(query: string, filters: SearchFilters) {
    const conditions: any = {
      isActive: true
    }

    // Busca por texto
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
      if (searchTerms.length > 0) {
        conditions.OR = [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            content: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            tags: {
              hasSome: searchTerms
            }
          }
        ]
      }
    }

    // Filtros
    if (filters.entityTypes?.length) {
      conditions.entityType = { in: filters.entityTypes }
    }

    if (filters.categories?.length) {
      conditions.categories = { hasSome: filters.categories }
    }

    if (filters.tags?.length) {
      conditions.tags = { hasSome: filters.tags }
    }

    if (filters.dateRange) {
      conditions.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to
      }
    }

    if (filters.popularity) {
      conditions.popularity = {
        gte: filters.popularity.min,
        lte: filters.popularity.max
      }
    }

    return conditions
  }

  private buildOrderByClause(sortBy: string, sortOrder: string) {
    const orderMap: Record<string, any> = {
      relevance: { relevance: sortOrder },
      popularity: { popularity: sortOrder },
      date: { createdAt: sortOrder },
      title: { title: sortOrder }
    }

    return orderMap[sortBy] || { relevance: 'desc' }
  }

  private processResults(results: any[], query: string, highlight: boolean): SearchResult[] {
    return results.map(result => {
      const score = this.calculateRelevanceScore(result, query)
      
      return {
        id: result.id,
        entityType: result.entityType,
        entityId: result.entityId,
        title: highlight ? this.highlightText(result.title, query) : result.title,
        content: highlight ? this.highlightText(result.content, query) : result.content,
        summary: result.summary,
        tags: result.tags,
        categories: result.categories,
        metadata: result.metadata,
        popularity: result.popularity,
        relevance: result.relevance,
        score
      }
    })
  }

  private calculateRelevanceScore(result: any, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase()
    const titleLower = result.title.toLowerCase()
    const contentLower = result.content.toLowerCase()

    // Score por título
    if (titleLower.includes(queryLower)) {
      score += 10
      if (titleLower.startsWith(queryLower)) score += 5
    }

    // Score por conteúdo
    const contentMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length
    score += contentMatches * 2

    // Score por tags
    const tagMatches = result.tags.filter((tag: string) => 
      tag.toLowerCase().includes(queryLower)
    ).length
    score += tagMatches * 3

    // Score por popularidade
    score += result.popularity * 0.1

    return score
  }

  private highlightText(text: string, query: string): string {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  private generateSearchVector(title: string, content: string): string {
    // Simples implementação de vetor de busca
    const text = `${title} ${content}`.toLowerCase()
    const words = text.split(/\W+/).filter(word => word.length > 2)
    return words.join(' ')
  }

  private async getFacets(whereClause: any): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = []

    // Faceta de tipos de entidade
    const entityTypes = await prisma.searchIndex.groupBy({
      by: ['entityType'],
      where: whereClause,
      _count: true
    })

    facets.push({
      name: 'entityType',
      type: 'category',
      values: entityTypes.map(item => ({
        value: item.entityType,
        count: item._count
      }))
    })

    // Faceta de categorias
    const results = await prisma.searchIndex.findMany({
      where: whereClause,
      select: { categories: true }
    })

    const categoryCount: Record<string, number> = {}
    results.forEach(result => {
      result.categories.forEach(category => {
        categoryCount[category] = (categoryCount[category] || 0) + 1
      })
    })

    facets.push({
      name: 'categories',
      type: 'category',
      values: Object.entries(categoryCount).map(([value, count]) => ({
        value,
        count
      }))
    })

    return facets
  }

  private async getSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return []

    const suggestions = await prisma.searchSuggestion.findMany({
      where: {
        query: {
          contains: query,
          mode: 'insensitive'
        },
        isActive: true
      },
      orderBy: { popularity: 'desc' },
      take: 5,
      select: { suggestion: true }
    })

    return suggestions.map(s => s.suggestion)
  }

  private async logSearchQuery(
    query: string,
    filters: SearchFilters,
    resultCount: number
  ): Promise<void> {
    try {
      await prisma.searchQuery.create({
        data: {
          query,
          filters: (filters as unknown) as Prisma.InputJsonValue,
          resultCount,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Erro ao registrar query de busca:', error)
    }
  }

  private generateCacheKey(
    query: string,
    filters: SearchFilters,
    options: SearchOptions
  ): string {
    const key = {
      query,
      filters,
      options
    }
    return `${this.cachePrefix}${Buffer.from(JSON.stringify(key)).toString('base64')}`
  }

  private async getFromCache(key: string): Promise<any> {
    try {
      const client = getRedis()
      if (!client) return null
      const cached = await client.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Erro ao buscar cache:', error)
      return null
    }
  }

  private async saveToCache(key: string, data: any, ttl = this.cacheTTL): Promise<void> {
    try {
      const client = getRedis()
      if (!client) return
      await client.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('Erro ao salvar cache:', error)
    }
  }

  private async clearSearchCache(): Promise<void> {
    try {
      const client = getRedis()
      if (!client) return
      const keys = await client.keys(`${this.cachePrefix}*`)
      if (keys.length > 0) {
        await client.del(...keys)
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error)
    }
  }
}

export const searchService = new SearchService()
export default searchService
