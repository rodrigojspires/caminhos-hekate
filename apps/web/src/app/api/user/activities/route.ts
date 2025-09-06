import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/user/activities?limit=10 - Atividades recentes do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

    // Basear em analyticsEvent quando disponível; complementar com progressos
    const events = await prisma.analyticsEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: { id: true, name: true, category: true, action: true, timestamp: true, properties: true }
    })

    const activities = events.map(ev => ({
      id: ev.id,
      type: (ev.action?.toLowerCase().replace(/\s+/g, '_') || 'event') as any,
      title: ev.name || 'Atividade',
      description: ev.category || '',
      timestamp: ev.timestamp.toISOString(),
      metadata: ev.properties as any
    }))

    // Se não houver eventos suficientes, complementar com progressos de aulas
    if (activities.length < limit) {
      const remain = limit - activities.length
      const progresses = await prisma.progress.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        take: remain,
        select: { id: true, completed: true, updatedAt: true, lesson: { select: { title: true } } }
      })
      const extra = progresses.map(p => ({
        id: p.id,
        type: (p.completed ? 'lesson_completed' : 'lesson_progress') as any,
        title: p.lesson?.title || 'Lição',
        description: p.completed ? 'Lição concluída' : 'Progresso na lição',
        timestamp: p.updatedAt.toISOString(),
        metadata: {}
      }))
      activities.push(...extra)
    }

    return NextResponse.json({ activities, total: activities.length, hasMore: false })
  } catch (error) {
    console.error('Erro ao obter atividades do usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

