import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/auth/login-history?limit=10
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)

    const history = await prisma.loginHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, createdAt: true, success: true as any, ipAddress: true as any, userAgent: true as any, location: true as any }
    })

    const payload = history.map(h => ({
      id: h.id,
      device: (h as any).userAgent || 'unknown',
      location: (h as any).location || 'unknown',
      ip: (h as any).ipAddress || 'unknown',
      timestamp: h.createdAt.toISOString(),
      success: (h as any).success !== false,
      action: 'login'
    }))

    return NextResponse.json({ history: payload })
  } catch (error) {
    console.error('Erro ao obter histórico de login:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

