import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchService } from '@/lib/search'

// Schema de validação para sugestões
const suggestionsSchema = z.object({
  q: z.string().min(1, 'Query é obrigatória'),
  limit: z.number().min(1).max(20).default(10),
  entityTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional()
})

// GET /api/search/suggestions - Obter sugestões de busca
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extrair parâmetros
    const params = {
      q: searchParams.get('q') || '',
      limit: Number(searchParams.get('limit')) || 10,
      entityTypes: searchParams.get('entityTypes')?.split(',').filter(Boolean),
      categories: searchParams.get('categories')?.split(',').filter(Boolean)
    }

    // Validar parâmetros
    const validatedParams = suggestionsSchema.parse(params)

    // Construir filtros
    const filters = {
      entityTypes: validatedParams.entityTypes,
      categories: validatedParams.categories
    }

    // Obter sugestões
    const suggestions = await searchService.getSearchSuggestions(
      validatedParams.q,
      validatedParams.limit
    )

    return NextResponse.json({
      success: true,
      data: suggestions
    })

  } catch (error) {
    console.error('Erro ao obter sugestões:', error)
    
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