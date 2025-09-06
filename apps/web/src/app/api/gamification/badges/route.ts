import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/badges - Get user badges
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const earned = searchParams.get('earned')
    const rarity = searchParams.get('rarity')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // Build where clause for badges
    const badgeWhereClause: any = {}
    if (rarity) {
      badgeWhereClause.rarity = rarity
    }

    // Get all badges with user progress
    const [badges, total] = await Promise.all([
      prisma.badge.findMany({
      where: badgeWhereClause,
      include: {
        userBadges: {
          where: {
            userId: session.user.id
          }
        }
      },
      orderBy: [
        { rarity: 'asc' },
        { name: 'asc' }
      ],
      skip,
      take: limit
    }),
      prisma.badge.count({ where: badgeWhereClause })
    ])

    // Transform data to include earned status
    const transformedBadges = badges.map(badge => {
      const userBadge = badge.userBadges[0]
      
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        color: badge.color,
        earned: !!userBadge,
        earnedAt: userBadge?.earnedAt
      }
    })

    // Filter by earned status if specified
    let filteredBadges = transformedBadges
    if (earned === 'true') {
      filteredBadges = transformedBadges.filter(b => b.earned)
    } else if (earned === 'false') {
      filteredBadges = transformedBadges.filter(b => !b.earned)
    }

    return NextResponse.json({
      data: filteredBadges,
      page,
      limit,
      total
    })
  } catch (error) {
    console.error('Erro ao buscar badges:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/badges - Manually award badge (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Check if user is admin (you might want to implement proper role checking)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { userId, badgeId } = await request.json()

    if (!userId || !badgeId) {
      return NextResponse.json(
        { error: 'userId e badgeId são obrigatórios' },
        { status: 400 }
      )
    }

    // Check if badge exists
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId }
    })

    if (!badge) {
      return NextResponse.json(
        { error: 'Badge não encontrado' },
        { status: 404 }
      )
    }

    // Check if user already has this badge
    const existingUserBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      }
    })

    if (existingUserBadge) {
      return NextResponse.json(
        { error: 'Usuário já possui este badge' },
        { status: 400 }
      )
    }

    // Create user badge
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        earnedAt: new Date()
      }
    })

    return NextResponse.json({
      userBadge,
      badge
    })
  } catch (error) {
    console.error('Erro ao conceder badge:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
