import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { resolveCommunityId } from '@/lib/community'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const communityId = searchParams.get('communityId')
    const resolvedCommunityId = await resolveCommunityId(communityId)
    const communityFilter = communityId
      ? { communityId: resolvedCommunityId }
      : { OR: [{ communityId: resolvedCommunityId }, { communityId: null }] }
    const topics = await prisma.topic.findMany({
      where: communityFilter,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        createdAt: true,
        communityId: true,
        community: { select: { id: true, name: true } }
      }
    })
    return NextResponse.json({ topics })
  } catch (error) {
    console.error('Erro ao listar tópicos:', error)
    return NextResponse.json({ topics: [] })
  }
}
