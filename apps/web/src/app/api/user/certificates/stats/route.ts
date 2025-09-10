import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/user/certificates/stats - Estatísticas de certificados do usuário autenticado
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    const [totalCertificates, completedThisMonth, averageScore] = await Promise.all([
      prisma.certificate.count({ where: { userId } }),
      prisma.certificate.count({
        where: {
          userId,
          issuedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.quizAttempt.aggregate({
        where: { userId },
        _avg: { score: true },
      }).then((r) => (r._avg.score ? Math.round(Number(r._avg.score)) : 0)),
    ])

    // downloadCount total não está diretamente no modelo Certificate.
    // Usaremos contagem de downloads digitais do usuário como proxy de atividade.
    const downloadCount = await prisma.download.aggregate({
      where: { userId },
      _sum: { downloadCount: true },
    }).then((r) => Number(r._sum.downloadCount || 0))

    return NextResponse.json({ totalCertificates, completedThisMonth, downloadCount, averageScore })
  } catch (error) {
    console.error('GET /api/user/certificates/stats error', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}