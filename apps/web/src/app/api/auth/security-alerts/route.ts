import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/auth/security-alerts?limit=10&resolved=false
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)

    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const history = await prisma.loginHistory.findMany({
      where: { userId: session.user.id, createdAt: { gte: last30 } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, createdAt: true, success: true as any, ipAddress: true as any, userAgent: true as any, location: true as any }
    })

    // Heurística simples: falhas de login e novos IPs diferentes dos últimos 5
    const knownIps = new Set(history.slice(0, 50).map(h => (h as any).ipAddress).filter(Boolean))
    const alerts: any[] = []
    for (const h of history) {
      const ip = (h as any).ipAddress
      if ((h as any).success === false) {
        alerts.push({
          id: `fail-${h.id}`,
          type: 'FAILED_LOGIN',
          severity: 'medium',
          title: 'Tentativa de login mal-sucedida',
          description: 'Uma tentativa de login falhou recentemente',
          status: 'PENDING',
          createdAt: h.createdAt.toISOString(),
          ipAddress: ip || 'unknown',
          userAgent: (h as any).userAgent || 'unknown',
          location: (h as any).location || 'unknown'
        })
      } else if (ip && !knownIps.has(ip)) {
        alerts.push({
          id: `newip-${h.id}`,
          type: 'NEW_DEVICE',
          severity: 'low',
          title: 'Novo dispositivo/IP detectado',
          description: 'Detectamos acesso de um IP diferente do habitual',
          status: 'PENDING',
          createdAt: h.createdAt.toISOString(),
          ipAddress: ip,
          userAgent: (h as any).userAgent || 'unknown',
          location: (h as any).location || 'unknown'
        })
      }
      if (alerts.length >= limit) break
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Erro ao carregar alertas de segurança:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

