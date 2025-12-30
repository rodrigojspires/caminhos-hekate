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
    const rows = await prisma.post.findMany({
      where: { status: 'PUBLISHED', ...communityFilter },
      distinct: ['authorId'],
      select: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' }
    })
    const authors = rows.map(r => r.author).filter(Boolean)
    return NextResponse.json({ authors })
  } catch (error) {
    console.error('Erro ao listar autores:', error)
    return NextResponse.json({ authors: [] })
  }
}
