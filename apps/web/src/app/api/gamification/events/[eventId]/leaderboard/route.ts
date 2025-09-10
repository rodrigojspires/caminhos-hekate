import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/events/[eventId]/leaderboard - Get event leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if event exists
    const event = await prisma.gamificationEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Get participants with their scores and ranks
    const participants = await prisma.gamificationEventParticipant.findMany({
      where: {
        eventId,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: [
        { currentScore: 'desc' },
        { enrolledAt: 'asc' } // Tie-breaker: earlier joiners rank higher
      ],
      take: limit,
      skip: offset
    })

    // Get user's own participation if not in the current page
    let userParticipation = null as any
    const userInCurrentPage = participants.find(p => p.userId === session.user.id)
    
    if (!userInCurrentPage) {
      userParticipation = await prisma.gamificationEventParticipant.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: session.user.id
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      })
    }

    // Transform data for frontend
    const leaderboard = participants.map((participant, index) => ({
      rank: offset + index + 1,
      userId: participant.userId,
      user: {
        id: participant.user.id,
        name: participant.user.name,
        image: participant.user.image
      },
      score: participant.currentScore,
      joinedAt: participant.enrolledAt,
      lastActivity: null as Date | null,
      isCurrentUser: participant.userId === session.user.id
    }))

    // Get total participants count
    const totalParticipants = await prisma.gamificationEventParticipant.count({
      where: {
        eventId,
        status: 'ACTIVE'
      }
    })

    // Prepare response
    const response: any = {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate
      },
      leaderboard,
      pagination: {
        limit,
        offset,
        total: totalParticipants
      }
    }

    // Add user's participation info if they're participating but not in current page
    if (userParticipation && !userInCurrentPage) {
      response.userParticipation = {
        rank: userParticipation.currentRank,
        userId: userParticipation.userId,
        user: {
          id: userParticipation.user.id,
          name: userParticipation.user.name,
          image: userParticipation.user.image
        },
        score: userParticipation.currentScore,
        joinedAt: userParticipation.enrolledAt,
        lastActivity: null as Date | null,
        isCurrentUser: true
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching event leaderboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}