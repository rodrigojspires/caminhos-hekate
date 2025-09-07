import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams { params: { id: string } }

// POST /api/subscriptions/[id]/pause - Pausa a assinatura (status PAUSED)
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const sub = await prisma.userSubscription.findUnique({ where: { id: params.id } })
    if (!sub) return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    if (sub.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const paused = await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'PAUSED' as any } , include: { plan: true }})
    // Política: pausar remove acesso imediato (downgrade para FREE)
    try {
      await prisma.user.update({ where: { id: paused.userId }, data: { subscriptionTier: 'FREE' as any } })
    } catch (e) {
      console.error('Erro ao definir usuário como FREE ao pausar assinatura:', e)
    }

    // Revogar downloads incluídos por assinatura
    try {
      const { revokeSubscriptionDownloads } = await import('@/lib/downloads')
      await revokeSubscriptionDownloads(paused.userId, paused.planId)
    } catch (e) {
      console.error('Erro ao revogar downloads de assinatura (pause):', e)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao pausar assinatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
