import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { ensureDefaultCommunity } from '@/lib/community'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    await ensureDefaultCommunity()

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === '1'

    const [communities, user] = await Promise.all([
      prisma.community.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { memberships: true } } }
      }),
      userId
        ? prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
        : null
    ])

    const memberships = userId
      ? await prisma.communityMembership.findMany({
          where: { userId, communityId: { in: communities.map((c) => c.id) } },
          select: { communityId: true, status: true }
        })
      : []

    const membershipMap = new Map(memberships.map((membership) => [membership.communityId, membership]))
    const userTier = user?.subscriptionTier || 'FREE'

    const data = communities.map((community) => {
      const membership = membershipMap.get(community.id)
      const accessModels = community.accessModels as string[]
      const isFree = accessModels.includes('FREE')
      const isPaid = accessModels.includes('ONE_TIME')
      const isSubscription = accessModels.includes('SUBSCRIPTION')
      const allowedByTier = isSubscription && tierOrder[userTier] >= tierOrder[community.tier]

      const accessLabels = [
        isFree ? 'Gratuita' : null,
        isSubscription ? `Assinatura ${community.tier}` : null,
        isPaid ? 'Compra avulsa' : null
      ].filter(Boolean)

      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        accessModels,
        tier: community.tier,
        price: community.price != null ? Number(community.price) : null,
        isActive: community.isActive,
        membersCount: community._count.memberships,
        isMember: !!membership,
        membershipStatus: membership?.status || null,
        allowedByTier,
        accessLabel: accessLabels.join(' • ')
      }
    })

    return NextResponse.json({ communities: data })
  } catch (error) {
    console.error('Erro ao listar comunidades:', error)
    return NextResponse.json({ error: 'Erro ao listar comunidades' }, { status: 500 })
  }
}
