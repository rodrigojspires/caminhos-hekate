import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getThemeService, CustomThemeSchema } from '@/lib/theme'
import { z } from 'zod'

// Schema para criação de tema
const CreateThemeSchema = CustomThemeSchema

// GET /api/themes - Listar temas (públicos + do usuário)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'public', 'user', 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verificar autenticação para temas do usuário
    const session = await getServerSession(authOptions)
    
    const themeService = getThemeService()
    let themes: any[]

    if (type === 'public') {
      // Temas públicos (não requer autenticação)
      themes = await themeService.getPublicThemes()
    } else if (type === 'user') {
      // Temas do usuário (requer autenticação)
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        )
      }
      // Por enquanto, retornar array vazio já que getUserThemes não existe
      themes = []
    } else {
      // Todos os temas (públicos + do usuário se autenticado)
      const publicThemes = await themeService.getPublicThemes()
      
      if (session?.user?.id) {
        // Por enquanto, usar apenas temas públicos já que getUserThemes não existe
        themes = publicThemes
      } else {
        themes = publicThemes
      }
    }

    return NextResponse.json({
      success: true,
      data: themes,
      pagination: {
        limit,
        offset,
        total: themes.length
      }
    })
  } catch (error) {
    console.error('Erro ao listar temas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/themes - Criar novo tema personalizado
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Validar dados da requisição
    const body = await request.json()
    const validatedData = CreateThemeSchema.parse(body)

    // Criar tema
    const themeService = getThemeService()
    const newTheme = await themeService.createCustomTheme(
      session.user.id,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: newTheme,
      message: 'Tema criado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tema:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}