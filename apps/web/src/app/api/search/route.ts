import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchService } from '@/lib/search'
import { prisma as db } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema de validação para busca
const searchSchema = z.object({
  q: z.string().min(1, 'Query é obrigatória'),
  entityTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  popularityMin: z.number().optional(),
  popularityMax: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['relevance', 'popularity', 'date', 'title']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  facets: z.boolean().default(false),
  highlight: z.boolean().default(true)
})

// Schema para indexação
const indexSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  metadata: z.any().optional(),
  popularity: z.number().optional()
})

// GET /api/search - Buscar conteúdo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extrair parâmetros
    const params = {
      q: searchParams.get('q') || '',
      entityTypes: searchParams.get('entityTypes')?.split(',').filter(Boolean),
      categories: searchParams.get('categories')?.split(',').filter(Boolean),
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      popularityMin: searchParams.get('popularityMin') ? Number(searchParams.get('popularityMin')) : undefined,
      popularityMax: searchParams.get('popularityMax') ? Number(searchParams.get('popularityMax')) : undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      sortBy: searchParams.get('sortBy') as any || 'relevance',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      facets: searchParams.get('facets') === 'true',
      highlight: searchParams.get('highlight') !== 'false'
    }

    // Validar parâmetros
    const validatedParams = searchSchema.parse(params)

    // Construir filtros
    const filters = {
      entityTypes: validatedParams.entityTypes,
      categories: validatedParams.categories,
      tags: validatedParams.tags,
      dateRange: validatedParams.dateFrom && validatedParams.dateTo ? {
        from: new Date(validatedParams.dateFrom),
        to: new Date(validatedParams.dateTo)
      } : undefined,
      popularity: validatedParams.popularityMin !== undefined || validatedParams.popularityMax !== undefined ? {
        min: validatedParams.popularityMin || 0,
        max: validatedParams.popularityMax || Number.MAX_SAFE_INTEGER
      } : undefined
    }

    // Opções de busca
    const options = {
      page: validatedParams.page,
      limit: validatedParams.limit,
      sortBy: validatedParams.sortBy,
      sortOrder: validatedParams.sortOrder,
      facets: validatedParams.facets,
      highlight: validatedParams.highlight
    }

    // Executar busca
    const engine = (process.env.SEARCH_ENGINE || '').toLowerCase() || (searchParams.get('engine') || '').toLowerCase()
    let results: any
    if (engine === 'fts') {
      try {
        // Tentar função unificada no Postgres, se existir
        const type = (validatedParams.entityTypes && validatedParams.entityTypes[0]) || 'all'
        const sort = validatedParams.sortBy
        const limit = validatedParams.limit
        const offset = (validatedParams.page - 1) * validatedParams.limit
        const filtersJson: any = {
          categories: validatedParams.categories,
          tags: validatedParams.tags
        }
        const query = validatedParams.q
        const rows = await db.$queryRawUnsafe<any[]>(
          `SELECT * FROM unified_search($1::text, $2::text, $3::jsonb, $4::text, $5::int, $6::int)`,
          query,
          type,
          JSON.stringify(filtersJson),
          sort,
          limit,
          offset
        )
        results = {
          results: rows.map(r => ({
            id: r.id,
            entityType: r.type,
            entityId: r.id,
            title: r.title,
            content: r.description,
            summary: undefined,
            tags: [],
            categories: [],
            metadata: r.metadata,
            popularity: 0,
            relevance: r.rank
          })),
          total: rows.length,
          page: validatedParams.page,
          limit: validatedParams.limit,
          facets: undefined,
          suggestions: []
        }
      } catch (e) {
        console.warn('FTS indisponível, usando mecanismo padrão:', e)
      }
    }
    if (!results) {
      results = await searchService.search(validatedParams.q, filters, options)
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Erro na busca:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetros inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    )
  }
}

// POST /api/search - Indexar conteúdo (apenas para admins)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Acesso negado'
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = indexSchema.parse(body)

    await searchService.indexContent(
      validatedData.entityType,
      validatedData.entityId,
      {
        title: validatedData.title,
        content: validatedData.content,
        summary: validatedData.summary,
        tags: validatedData.tags,
        categories: validatedData.categories,
        metadata: validatedData.metadata,
        popularity: validatedData.popularity
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Conteúdo indexado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao indexar conteúdo:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/search - Remover do índice (apenas para admins)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Acesso negado'
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'entityType e entityId são obrigatórios'
        },
        { status: 400 }
      )
    }

    await searchService.removeFromIndex(entityType, entityId)

    return NextResponse.json({
      success: true,
      message: 'Conteúdo removido do índice'
    })

  } catch (error) {
    console.error('Erro ao remover do índice:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    )
  }
}
