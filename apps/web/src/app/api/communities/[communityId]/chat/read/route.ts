import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(_req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: params.communityId, userId } },
      select: { status: true }
    })
    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await prisma.communityMembership.update({
      where: { communityId_userId: { communityId: params.communityId, userId } },
      data: { lastChatReadAt: new Date() }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao marcar chat como lido:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
