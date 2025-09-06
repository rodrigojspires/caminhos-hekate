import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

interface RouteParams {
  params: {
    key: string
  }
}

const UpdateSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional()
})

// GET /api/admin/settings/[key] - Buscar configuração por chave
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { key: params.key }
    })

    if (!setting) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings/[key] - Atualizar configuração
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = UpdateSettingSchema.parse(body)

    // Verificar se a configuração existe
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: params.key }
    })

    if (!existingSetting) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    const setting = await prisma.systemSettings.update({
      where: { key: params.key },
      data: {
        value: data.value,
        description: data.description,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/settings/[key] - Excluir configuração
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se a configuração existe
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: params.key }
    })

    if (!existingSetting) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    await prisma.systemSettings.delete({
      where: { key: params.key }
    })

    return NextResponse.json(
      { message: 'Configuração excluída com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir configuração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}