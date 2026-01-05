import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { membershipAccessWhere } from '@/lib/community-membership'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '4', 10), 10)

    const memberships = await prisma.communityMembership.findMany({
      where: { userId: session.user.id, ...membershipAccessWhere() },
      select: { communityId: true }
    })
    const communityIds = memberships.map((m) => m.communityId)

    if (communityIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const posts = await prisma.post.findMany({
      where: {
        communityId: { in: communityIds },
        status: 'PUBLISHED' as any,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        community: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Erro ao listar posts recentes:', error)
    return NextResponse.json({ posts: [] })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
