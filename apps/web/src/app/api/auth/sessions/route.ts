import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/auth/sessions - Sessões ativas aproximadas a partir do histórico de login
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const now = new Date()
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const history = await prisma.loginHistory.findMany({
      where: { userId: session.user.id, createdAt: { gte: last30 } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, createdAt: true, ipAddress: true as any, userAgent: true as any, success: true as any, location: true as any }
    })

    const ua = request.headers.get('user-agent') || 'unknown'
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0] || (request as any).ip || 'unknown'

    const sessions = history.slice(0, 5).map(h => ({
      id: h.id,
      device: (h as any).userAgent || 'unknown',
      location: (h as any).location || 'unknown',
      ip: (h as any).ipAddress || 'unknown',
      lastActive: h.createdAt.toISOString(),
      current: ((h as any).ipAddress === ip) && ((h as any).userAgent === ua)
    }))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Erro ao obter sessões:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

