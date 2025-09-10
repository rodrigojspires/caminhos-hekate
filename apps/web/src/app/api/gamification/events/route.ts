import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/events - Get all gamification events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status.toUpperCase()
    }
    if (category) {
      where.category = category
    }

    const events = await prisma.gamificationEvent.findMany({
      where,
      include: {
        participants: {
          select: {
            id: true,
            userId: true,
            currentScore: true,
            currentRank: true,
            status: true
          }
        },
        eventRewards: {
          include: {
            reward: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Transform data for frontend
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      maxParticipants: event.maxParticipants,
      entryFeePoints: event.entryFeePoints,
      prizePoolPoints: event.prizePoolPoints,
      status: event.status,
      rules: event.rules,
      metadata: event.metadata,
      participantsCount: event._count.participants,
      isParticipating: event.participants.some(p => p.userId === session.user.id),
      userRank: event.participants.find(p => p.userId === session.user.id)?.currentRank,
      userScore: event.participants.find(p => p.userId === session.user.id)?.currentScore,
      rewards: event.eventRewards.map(er => ({
        id: er.reward.id,
        name: er.reward.name,
        description: er.reward.description,
        rewardType: er.reward.rewardType,
        rewardValue: er.reward.rewardValue,
        rarity: er.reward.rarity,
        positionRequirement: er.positionRequirement,
        percentageRequirement: er.percentageRequirement
      })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }))

    return NextResponse.json({
      events: transformedEvents,
      pagination: {
        limit,
        offset,
        total: await prisma.gamificationEvent.count({ where })
      }
    })
  } catch (error) {
    console.error('Error fetching gamification events:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/events - Create new gamification event (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Check if user is admin (you may need to adjust this based on your user roles)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const {
      title,
      description,
      eventType,
      category,
      startDate,
      endDate,
      maxParticipants,
      entryFeePoints,
      prizePoolPoints,
      rules,
      metadata,
      rewards
    } = await request.json()

    // Validate required fields
    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Título, data de início e data de fim são obrigatórios' },
        { status: 400 }
      )
    }

    // Create event with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the event
      const event = await tx.gamificationEvent.create({
        data: {
          title,
          description,
          eventType: eventType || 'COMPETITION',
          category,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          maxParticipants,
          entryFeePoints: entryFeePoints || 0,
          prizePoolPoints: prizePoolPoints || 0,
          rules,
          metadata,
          createdBy: session.user.id
        }
      })

      // Create event rewards if provided
      if (rewards && rewards.length > 0) {
        await tx.gamificationEventReward.createMany({
          data: rewards.map((reward: any) => ({
            eventId: event.id,
            rewardId: reward.rewardId,
            positionRequirement: reward.positionRequirement,
            percentageRequirement: reward.percentageRequirement
          }))
        })
      }

      return event
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating gamification event:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

