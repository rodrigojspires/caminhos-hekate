import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        rarity: true,
        points: true,
        category: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ achievements })
  } catch (error) {
    console.error('Erro ao listar emblemas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
