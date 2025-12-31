import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

export async function GET(_req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const [community, user, membership] = await Promise.all([
      prisma.community.findUnique({
        where: { id: params.communityId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          accessModels: true,
          tier: true,
          price: true,
          isActive: true
        }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true }
      }),
      prisma.communityMembership.findUnique({
        where: { communityId_userId: { communityId: params.communityId, userId } },
        select: { status: true }
      })
    ])

    if (!community) {
      return NextResponse.json({ error: 'Comunidade não encontrada' }, { status: 404 })
    }

    const accessModels = community.accessModels as string[]
    const isFree = accessModels.includes('FREE')
    const isSubscription = accessModels.includes('SUBSCRIPTION')
    const allowedByTier = isSubscription && tierOrder[user?.subscriptionTier || 'FREE'] >= tierOrder[community.tier]
    const isMember = !!membership
    const canAccess = isFree || allowedByTier || membership?.status === 'active'

    const [topics, posts, files, members, membersCount] = canAccess
      ? await Promise.all([
          prisma.topic.findMany({
            where: { communityId: community.id },
            orderBy: { order: 'asc' },
            select: { id: true, name: true, slug: true, color: true }
          }),
          prisma.post.findMany({
            where: { communityId: community.id, status: 'PUBLISHED' },
            orderBy: { createdAt: 'desc' },
            take: 12,
            include: {
              author: { select: { id: true, name: true, image: true } },
              topic: { select: { id: true, name: true, slug: true, color: true } },
              _count: { select: { comments: true, reactions: true } }
            }
          }),
          prisma.communityFile.findMany({
            where: { communityId: community.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              title: true,
              description: true,
              fileUrl: true,
              fileType: true,
              fileSize: true,
              createdAt: true
            }
          }),
          prisma.communityMembership.findMany({
            where: { communityId: community.id, status: 'active' },
            orderBy: { joinedAt: 'desc' },
            take: 12,
            select: {
              user: {
                select: { id: true, name: true, image: true }
              }
            }
          }),
          prisma.communityMembership.count({
            where: { communityId: community.id, status: 'active' }
          })
        ])
      : [[], [], [], [], 0]

    return NextResponse.json({
      community: {
        ...community,
        price: community.price != null ? Number(community.price) : null
      },
      membershipStatus: membership?.status || null,
      isMember,
      canAccess,
      topics,
      posts,
      files,
      members: members.map((member) => member.user),
      membersCount
    })
  } catch (error) {
    console.error('Erro ao buscar comunidade (overview):', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
