import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema de validação para atualização de assinatura
const updateSubscriptionSchema = z.object({
  subscription: z.enum(['FREE', 'PREMIUM', 'VIP']),
  subscriptionExpiresAt: z.string().nullable().optional(),
  subscriptionStartedAt: z.string().nullable().optional()
})

// PUT - Atualizar assinatura do usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateSubscriptionSchema.parse(body)

    // Simular atualização no banco de dados
    // Em um projeto real, você faria:
    // const updatedUser = await prisma.user.update({
    //   where: { id: params.id },
    //   data: {
    //     subscription: validatedData.subscription,
    //     subscriptionExpiresAt: validatedData.subscriptionExpiresAt ? new Date(validatedData.subscriptionExpiresAt) : null,
    //     subscriptionStartedAt: validatedData.subscriptionStartedAt ? new Date(validatedData.subscriptionStartedAt) : null,
    //     updatedAt: new Date()
    //   }
    // })

    const updatedUser = {
      id: params.id,
      subscription: validatedData.subscription,
      subscriptionExpiresAt: validatedData.subscriptionExpiresAt,
      subscriptionStartedAt: validatedData.subscriptionStartedAt,
      updatedAt: new Date().toISOString()
    }

    // Log da ação para auditoria
    console.log(`Admin ${session.user.email} updated subscription for user ${params.id}:`, {
      from: 'CURRENT_SUBSCRIPTION', // Em um projeto real, buscar do banco
      to: validatedData.subscription,
      expiresAt: validatedData.subscriptionExpiresAt,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Assinatura atualizada com sucesso',
      user: updatedUser
    })

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error)
    
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

// DELETE - Cancelar assinatura (downgrade para FREE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Simular cancelamento no banco de dados
    // Em um projeto real, você faria:
    // const updatedUser = await prisma.user.update({
    //   where: { id: params.id },
    //   data: {
    //     subscription: 'FREE',
    //     subscriptionExpiresAt: null,
    //     subscriptionStartedAt: null,
    //     updatedAt: new Date()
    //   }
    // })

    const updatedUser = {
      id: params.id,
      subscription: 'FREE',
      subscriptionExpiresAt: null,
      subscriptionStartedAt: null,
      updatedAt: new Date().toISOString()
    }

    // Log da ação para auditoria
    console.log(`Admin ${session.user.email} cancelled subscription for user ${params.id}:`, {
      action: 'SUBSCRIPTION_CANCELLED',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Assinatura cancelada com sucesso',
      user: updatedUser
    })

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error)
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Obter histórico de assinaturas do usuário
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Simular busca do histórico no banco de dados
    // Em um projeto real, você faria:
    // const subscriptionHistory = await prisma.subscriptionHistory.findMany({
    //   where: { userId: params.id },
    //   orderBy: { createdAt: 'desc' }
    // })

    const subscriptionHistory = [
      {
        id: '1',
        userId: params.id,
        subscription: 'PREMIUM',
        action: 'UPGRADED',
        previousSubscription: 'FREE',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias no futuro
        adminId: session.user.id,
        adminEmail: session.user.email
      },
      {
        id: '2',
        userId: params.id,
        subscription: 'FREE',
        action: 'CREATED',
        previousSubscription: null,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias atrás
        expiresAt: null,
        adminId: null,
        adminEmail: null
      }
    ]

    return NextResponse.json({
      history: subscriptionHistory,
      total: subscriptionHistory.length
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de assinaturas:', error)
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}