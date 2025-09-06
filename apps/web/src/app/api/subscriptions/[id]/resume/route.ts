import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams { params: { id: string } }

// POST /api/subscriptions/[id]/resume - Retoma a assinatura (status ACTIVE)
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const sub = await prisma.userSubscription.findUnique({ where: { id: params.id } })
    if (!sub) return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    if (sub.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'ACTIVE' as any } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao retomar assinatura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

