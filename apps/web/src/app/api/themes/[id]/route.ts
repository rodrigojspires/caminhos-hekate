import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getThemeService, CustomThemeSchema } from '@/lib/theme'
import { z } from 'zod'

// Schema para atualização de tema
const UpdateThemeSchema = CustomThemeSchema.partial()

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/themes/[id] - Obter tema específico
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const themeId = params.id
    
    if (!themeId) {
      return NextResponse.json(
        { error: 'ID do tema é obrigatório' },
        { status: 400 }
      )
    }

    const themeService = getThemeService()
    const theme = await themeService.getThemeById(themeId)

    if (!theme) {
      return NextResponse.json(
        { error: 'Tema não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o tema é público ou se o usuário é o proprietário
    const session = await getServerSession(authOptions)
    if (!theme.isPublic && theme.userId !== session?.user?.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: theme
    })
  } catch (error) {
    console.error('Erro ao obter tema:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/themes/[id] - Atualizar tema
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const themeId = params.id
    
    if (!themeId) {
      return NextResponse.json(
        { error: 'ID do tema é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o tema existe e se o usuário é o proprietário
    const themeService = getThemeService()
    const existingTheme = await themeService.getThemeById(themeId)

    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Tema não encontrado' },
        { status: 404 }
      )
    }

    if (existingTheme.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Validar dados da requisição
    const body = await request.json()
    const validatedData = UpdateThemeSchema.parse(body)

    // Atualizar tema
    const updatedTheme = await themeService.updateCustomTheme(
      themeId,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: updatedTheme,
      message: 'Tema atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar tema:', error)
    
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

// DELETE /api/themes/[id] - Deletar tema
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const themeId = params.id
    
    if (!themeId) {
      return NextResponse.json(
        { error: 'ID do tema é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o tema existe e se o usuário é o proprietário
    const themeService = getThemeService()
    const existingTheme = await themeService.getThemeById(themeId)

    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Tema não encontrado' },
        { status: 404 }
      )
    }

    if (existingTheme.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Deletar tema
    await themeService.deleteCustomTheme(themeId)

    return NextResponse.json({
      success: true,
      message: 'Tema deletado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar tema:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/themes/[id]/duplicate - Duplicar tema
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const themeId = params.id
    
    if (!themeId) {
      return NextResponse.json(
        { error: 'ID do tema é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o tema existe
    const themeService = getThemeService()
    const existingTheme = await themeService.getThemeById(themeId)

    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Tema não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o tema é público ou se o usuário é o proprietário
    if (!existingTheme.isPublic && existingTheme.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Obter nome personalizado do corpo da requisição
    const body = await request.json().catch(() => ({}))
    const customName = body.name || `${existingTheme.name} (Cópia)`

    // Duplicar tema
    const duplicatedTheme = await themeService.createCustomTheme(
      session.user.id,
      {
        name: customName,
        colors: existingTheme.colors,
        typography: existingTheme.typography,
        spacing: existingTheme.spacing,
        isPublic: false // Cópias são sempre privadas inicialmente
      }
    )

    return NextResponse.json({
      success: true,
      data: duplicatedTheme,
      message: 'Tema duplicado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao duplicar tema:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}