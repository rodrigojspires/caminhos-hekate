import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchService } from '@/lib/search'
import { prisma } from '@hekate/database'

// Schema de validação para facetas
const facetsSchema = z.object({
  entityTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  popularityMin: z.number().optional(),
  popularityMax: z.number().optional()
})

// GET /api/search/facets - Obter facetas ativas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extrair parâmetros
    const params = {
      entityTypes: searchParams.get('entityTypes')?.split(',').filter(Boolean),
      categories: searchParams.get('categories')?.split(',').filter(Boolean),
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      popularityMin: searchParams.get('popularityMin') ? Number(searchParams.get('popularityMin')) : undefined,
      popularityMax: searchParams.get('popularityMax') ? Number(searchParams.get('popularityMax')) : undefined
    }

    // Validar parâmetros
    const validatedParams = facetsSchema.parse(params)

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

    // Obter facetas ativas e enriquecer com nível/duração/preço
    const facets = await searchService.getActiveFacets()

    // Consultar amostra para derivar facetas de metadados
    const rows = await prisma.searchIndex.findMany({
      where: {},
      select: { metadata: true },
      take: 1000,
    })

    const levelCounts: Record<string, number> = {}
    const durationBuckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-120': 0, '120+': 0 }
    const priceBuckets: Record<string, number> = { free: 0, low: 0, mid: 0, high: 0 }

    rows.forEach(r => {
      const meta: any = r.metadata || {}
      const level = String(meta.level || '').toLowerCase()
      if (level) levelCounts[level] = (levelCounts[level] || 0) + 1
      const duration = Number(meta.durationMinutes || meta.duration || 0)
      if (!isNaN(duration)) {
        if (duration <= 30) durationBuckets['0-30']++
        else if (duration <= 60) durationBuckets['31-60']++
        else if (duration <= 120) durationBuckets['61-120']++
        else durationBuckets['120+']++
      }
      const price = Number(meta.price || 0)
      if (!isNaN(price)) {
        if (price === 0) priceBuckets.free++
        else if (price <= 50) priceBuckets.low++
        else if (price <= 200) priceBuckets.mid++
        else priceBuckets.high++
      }
    })

    const extra = [
      {
        name: 'level',
        type: 'category',
        values: Object.entries(levelCounts).map(([value, count]) => ({ value, count })),
      },
      {
        name: 'duration',
        type: 'range',
        values: Object.entries(durationBuckets).map(([value, count]) => ({ value, count })),
      },
      {
        name: 'price',
        type: 'range',
        values: Object.entries(priceBuckets).map(([value, count]) => ({ value, count })),
      },
    ]

    return NextResponse.json({ success: true, data: [...facets, ...extra] })

  } catch (error) {
    console.error('Erro ao obter facetas:', error)
    
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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
