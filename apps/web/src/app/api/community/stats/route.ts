import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export async function GET(_req: NextRequest) {
  try {
    const today = startOfToday()

    const [
      totalMembers,
      totalPosts,
      totalComments,
      totalTopics,
      totalLikes,
      newMembersToday,
      newPostsToday,
      newCommentsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.topic.count(),
      prisma.reaction.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.post.count({ where: { createdAt: { gte: today } } }),
      prisma.comment.count({ where: { createdAt: { gte: today } } }),
    ])

    const mostActiveMembers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        _count: { select: { posts: true, comments: true } },
      },
      orderBy: [
        { posts: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
      ],
      take: 5,
    })

    const mostPopularPosts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { name: true } },
        _count: { select: { reactions: true, comments: true } },
      },
      orderBy: [{ reactions: { _count: 'desc' } }, { comments: { _count: 'desc' } }],
      take: 5,
    })

    const mostActiveTopics = await prisma.topic.findMany({
      select: { id: true, name: true, _count: { select: { posts: true } } },
      orderBy: { posts: { _count: 'desc' } },
      take: 5,
    })

    return NextResponse.json({
      totalMembers,
      totalPosts,
      totalComments,
      totalTopics,
      totalLikes,
      newMembersToday,
      newPostsToday,
      newCommentsToday,
      mostActiveMembers: mostActiveMembers.map((u) => ({
        id: u.id,
        name: u.name || 'Usuário',
        avatar: u.image || undefined,
        postsCount: u._count.posts,
        commentsCount: u._count.comments,
      })),
      mostPopularPosts: mostPopularPosts.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author?.name || 'Usuário',
        likesCount: p._count.reactions,
        commentsCount: p._count.comments,
        createdAt: p.createdAt.toISOString(),
      })),
      mostActiveTopics: mostActiveTopics.map((t) => ({
        id: t.id,
        name: t.name,
        postsCount: t._count.posts,
        membersCount: t._count.posts, // aproximação
      })),
      dailyActivity: [],
      monthlyGrowth: [],
    })
  } catch (e) {
    console.error('GET /api/community/stats error', e)
    return NextResponse.json({ error: 'Erro ao obter estatísticas' }, { status: 500 })
  }
}

