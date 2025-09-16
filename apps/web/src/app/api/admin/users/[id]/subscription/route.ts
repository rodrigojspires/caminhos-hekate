import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para atualização de assinatura
const updateSubscriptionSchema = z.object({
  subscriptionTier: z.enum(['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']),
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

    // Atualizar tier no usuário
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { subscriptionTier: validatedData.subscriptionTier }
    })

    // Vincular/atualizar UserSubscription de acordo com o plano por tier
    const plan = await prisma.subscriptionPlan.findUnique({ where: { tier: validatedData.subscriptionTier as any } })
    if (plan) {
      const now = new Date()
      const start = validatedData.subscriptionStartedAt ? new Date(validatedData.subscriptionStartedAt) : now
      const end = validatedData.subscriptionExpiresAt ? new Date(validatedData.subscriptionExpiresAt) : new Date(now)
      if (!validatedData.subscriptionExpiresAt) {
        // Definir período padrão conforme interval no plano
        if (plan.interval === 'YEARLY') {
          end.setFullYear(end.getFullYear() + (plan.intervalCount || 1))
        } else if (plan.interval === 'MONTHLY') {
          end.setMonth(end.getMonth() + (plan.intervalCount || 1))
        } else if (plan.interval === 'QUARTERLY') {
          end.setMonth(end.getMonth() + 3 * (plan.intervalCount || 1))
        }
      }

      // Cria um novo registro ativo de assinatura do usuário
      await prisma.userSubscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: start,
          currentPeriodEnd: end,
        }
      })
    }

    return NextResponse.json({
      message: 'Assinatura atualizada com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        updatedAt: user.updatedAt
      }
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

    // Cancelar assinaturas ativas e ajustar usuário para FREE
    await prisma.userSubscription.updateMany({
      where: { userId: params.id, status: { not: 'CANCELED' } },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true, canceledAt: new Date() }
    })
    const updated = await prisma.user.update({ where: { id: params.id }, data: { subscriptionTier: 'FREE' } })

    // Log da ação para auditoria
    console.log(`Admin ${session.user.email} cancelled subscription for user ${params.id}:`, {
      action: 'SUBSCRIPTION_CANCELLED',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Assinatura cancelada com sucesso',
      user: { id: updated.id, email: updated.email, subscriptionTier: updated.subscriptionTier }
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

    const subs = await prisma.userSubscription.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
      include: { plan: true }
    })
    const payments = await prisma.paymentTransaction.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ subscriptions: subs, payments })

  } catch (error) {
    console.error('Erro ao buscar histórico de assinaturas:', error)
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
