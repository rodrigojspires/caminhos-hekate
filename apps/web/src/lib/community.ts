import { prisma } from '@hekate/database'

const DEFAULT_COMMUNITY = {
  name: 'Comunidade Geral',
  slug: 'comunidade-geral',
  description: 'Comunidade principal',
  accessModels: ['FREE'] as const,
  tier: 'FREE' as const
}

export async function ensureDefaultCommunity() {
  const existing = await prisma.community.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, slug: true }
  })

  if (existing) return existing

  return prisma.community.create({
    data: {
      name: DEFAULT_COMMUNITY.name,
      slug: DEFAULT_COMMUNITY.slug,
      description: DEFAULT_COMMUNITY.description,
      accessModels: DEFAULT_COMMUNITY.accessModels as any,
      tier: DEFAULT_COMMUNITY.tier
    },
    select: { id: true, name: true, slug: true }
  })
}

export async function resolveCommunityId(communityId?: string | null) {
  if (communityId) return communityId
  const community = await ensureDefaultCommunity()
  return community.id
}
