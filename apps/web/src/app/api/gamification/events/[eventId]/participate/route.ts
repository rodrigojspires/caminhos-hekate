import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// POST /api/gamification/events/[eventId]/participate - Join an event
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { eventId } = params

    // Check if event exists and is active
    const event = await prisma.gamificationEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Check if event is active and not ended
    const now = new Date()
    if (event.status !== 'ACTIVE' || event.endDate < now) {
      return NextResponse.json(
        { error: 'Evento não está ativo ou já terminou' },
        { status: 400 }
      )
    }

    // Check if event hasn't started yet
    if (event.startDate > now) {
      return NextResponse.json(
        { error: 'Evento ainda não começou' },
        { status: 400 }
      )
    }

    // Check if user is already participating
    const isAlreadyParticipating = event.participants.some(
      p => p.userId === session.user.id
    )

    if (isAlreadyParticipating) {
      return NextResponse.json(
        { error: 'Você já está participando deste evento' },
        { status: 400 }
      )
    }

    // Check if event has reached max participants
    if (event.maxParticipants && event._count.participants >= event.maxParticipants) {
      return NextResponse.json(
        { error: 'Evento lotado' },
        { status: 400 }
      )
    }

    // Check if user has enough points for entry fee
    if (event.entryFeePoints > 0) {
      const userPoints = await prisma.userPoints.findUnique({
        where: { userId: session.user.id }
      })

      if (!userPoints || userPoints.totalPoints < event.entryFeePoints) {
        return NextResponse.json(
          { error: 'Pontos insuficientes para participar' },
          { status: 400 }
        )
      }
    }

    // Create participation and deduct entry fee if applicable
    const result = await prisma.$transaction(async (tx) => {
      // Create participation
      const participation = await tx.gamificationEventParticipant.create({
        data: {
          eventId,
          userId: session.user.id,
          currentScore: 0,
          currentRank: event._count.participants + 1,
          status: 'ACTIVE'
        }
      })

      // Deduct entry fee if applicable
      if (event.entryFeePoints > 0) {
        // Update user points
        await tx.userPoints.update({
          where: { userId: session.user.id },
          data: {
            totalPoints: {
              decrement: event.entryFeePoints
            }
          }
        })

        // Create point transaction record
        await tx.pointTransaction.create({
          data: {
            userId: session.user.id,
            points: -event.entryFeePoints,
            type: 'SPENT',
            reason: 'EVENT_ENTRY_FEE',
            description: `Taxa de entrada para evento: ${event.title}`,
            metadata: {
              eventId,
              eventTitle: event.title
            }
          }
        })
      }

      return participation
    })

    return NextResponse.json({
      message: 'Participação confirmada com sucesso',
      participation: result
    }, { status: 201 })
  } catch (error) {
    console.error('Error joining gamification event:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/gamification/events/[eventId]/participate - Leave an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { eventId } = params

    // Check if event exists
    const event = await prisma.gamificationEvent.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Check if user is participating
    const participation = await prisma.gamificationEventParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      }
    })

    if (!participation) {
      return NextResponse.json(
        { error: 'Você não está participando deste evento' },
        { status: 400 }
      )
    }

    // Check if event has already ended
    const now = new Date()
    if (event.endDate < now) {
      return NextResponse.json(
        { error: 'Não é possível sair de um evento que já terminou' },
        { status: 400 }
      )
    }

    // Remove participation and refund entry fee if applicable
    await prisma.$transaction(async (tx) => {
      // Remove participation
      await tx.gamificationEventParticipant.delete({
        where: {
          eventId_userId: {
            eventId,
            userId: session.user.id
          }
        }
      })

      // Refund entry fee if applicable and event hasn't started yet
      if (event.entryFeePoints > 0 && event.startDate > now) {
        // Update user points
        await tx.userPoints.update({
          where: { userId: session.user.id },
          data: {
            totalPoints: {
              increment: event.entryFeePoints
            }
          }
        })

        // Create point transaction record
        await tx.pointTransaction.create({
          data: {
            userId: session.user.id,
            points: event.entryFeePoints,
            type: 'REFUND',
            reason: 'EVENT_REFUND',
            description: `Reembolso de taxa de entrada: ${event.title}`,
            metadata: {
              eventId,
              eventTitle: event.title
            }
          }
        })
      }
    })

    return NextResponse.json({
      message: 'Participação removida com sucesso'
    })
  } catch (error) {
    console.error('Error leaving gamification event:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}