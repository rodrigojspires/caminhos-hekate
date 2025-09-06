import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/streaks - Get user streaks
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
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    // Build where clause
    const whereClause: any = {
      userId: session.user.id
    }
    
    if (type) {
      whereClause.type = type
    }
    
    if (active === 'true') {
      whereClause.isActive = true
    } else if (active === 'false') {
      whereClause.isActive = false
    }

    const userStreaks = await prisma.userStreak.findMany({
      where: whereClause,
      orderBy: [
        { isActive: 'desc' },
        { currentStreak: 'desc' }
      ]
    })

    return NextResponse.json(userStreaks)
  } catch (error) {
    console.error('Erro ao buscar sequências:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}