import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/events/[eventId]/scoreboard - Event scoreboard
export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const eventId = params.eventId

  try {
    // Verificar se o evento existe
    const event = await prisma.gamificationEvent.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Buscar participantes com suas pontuações
    const participants = await prisma.gamificationEventParticipant.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        currentScore: 'desc'
      }
    })

    // Construir leaderboard com ranking
    const leaderboard = participants.map((participant, index) => ({
      userId: participant.userId,
      name: participant.user.name || 'Usuário Anônimo',
      points: participant.currentScore || 0,
      rank: index + 1,
      avatar: participant.user.image,
      joinedAt: participant.enrolledAt.toISOString(),
      lastActivity: participant.enrolledAt.toISOString()
    }))

    // Estatísticas do evento
    const totalParticipants = participants.length
    const totalPoints = participants.reduce((sum, p) => sum + (p.currentScore || 0), 0)
    const averagePoints = totalParticipants > 0 ? Math.round(totalPoints / totalParticipants) : 0

    return NextResponse.json({
      eventId,
      event: {
        title: event.title,
        description: event.description,
        status: event.status,
        startDate: event.startDate?.toISOString(),
        endDate: event.endDate?.toISOString()
      },
      leaderboard,
      stats: {
        totalParticipants,
        totalPoints,
        averagePoints,
        topScore: participants[0]?.currentScore || 0
      },
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar scoreboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}