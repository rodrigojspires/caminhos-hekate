import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getThemeService, UserPreferencesSchema } from '@/lib/theme'
import { z } from 'zod'

// Schema para validação da requisição
const UpdatePreferencesSchema = UserPreferencesSchema.partial()

// GET /api/preferences - Obter preferências do usuário
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Obter preferências
    const themeService = getThemeService()
    const preferences = await themeService.getUserPreferences(session.user.id)

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Erro ao obter preferências:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/preferences - Atualizar preferências do usuário
export async function PUT(request: NextRequest) {
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
    const validatedData = UpdatePreferencesSchema.parse(body)

    // Atualizar preferências
    const themeService = getThemeService()
    const updatedPreferences = await themeService.updatePreferences(
      session.user.id,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferências atualizadas com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error)
    
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

// DELETE /api/preferences - Resetar preferências para padrão
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Resetar para preferências padrão
    const themeService = getThemeService()
    const defaultPreferences = {
      theme: {
        colors: undefined, // Usar padrão
        typography: undefined, // Usar padrão
        spacing: undefined, // Usar padrão
        mode: 'light' as const
      },
      layout: {
        sidebar: { width: 280, collapsed: false },
        header: { height: 64, fixed: true },
        maxWidth: 'xl' as const
      },
      accessibility: {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        screenReader: false
      },
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo'
    }

    const resetPreferences = await themeService.updatePreferences(
      session.user.id,
      defaultPreferences
    )

    return NextResponse.json({
      success: true,
      data: resetPreferences,
      message: 'Preferências resetadas para o padrão'
    })
  } catch (error) {
    console.error('Erro ao resetar preferências:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}