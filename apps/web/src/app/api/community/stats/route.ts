import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@hekate/database'

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().split('T')[0]
}

function formatMonthKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().slice(0, 7)
}

export async function GET(_req: NextRequest) {
  try {
    const today = startOfToday()
    const now = new Date()
    const startDaily = new Date(today)
    startDaily.setDate(startDaily.getDate() - 6)
    const monthsToShow = 6
    const startMonth = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1), 1)

    const baseUserFilter = { NOT: { email: { startsWith: 'deleted_' } } } as const

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
      prisma.user.count({ where: baseUserFilter }),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.topic.count(),
      prisma.reaction.count(),
      prisma.user.count({ where: { ...baseUserFilter, createdAt: { gte: today } } }),
      prisma.post.count({ where: { createdAt: { gte: today } } }),
      prisma.comment.count({ where: { createdAt: { gte: today } } }),
    ])

    const [postsByDay, commentsByDay, likesByDay] = await Promise.all([
      prisma.$queryRaw<{ date: Date; count: number }[]>(
        Prisma.sql`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "Post"
          WHERE "createdAt" >= ${startDaily}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      ),
      prisma.$queryRaw<{ date: Date; count: number }[]>(
        Prisma.sql`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "Comment"
          WHERE "createdAt" >= ${startDaily}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      ),
      prisma.$queryRaw<{ date: Date; count: number }[]>(
        Prisma.sql`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "Reaction"
          WHERE "createdAt" >= ${startDaily}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      )
    ])

    const mostActiveMembers = await prisma.user.findMany({
      where: baseUserFilter,
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

    const mostActiveTopics = await prisma.$queryRaw<{
      id: string
      name: string
      posts: number
      members: number
    }[]>(
      Prisma.sql`
        SELECT 
          t."id",
          t."name",
          COALESCE(COUNT(p."id"), 0)::int as posts,
          COALESCE(COUNT(DISTINCT p."authorId"), 0)::int as members
        FROM "Topic" t
        LEFT JOIN "Post" p ON p."topicId" = t."id"
        GROUP BY t."id"
        ORDER BY posts DESC
        LIMIT 5
      `
    )

    const [membersByMonth, postsByMonth, commentsByMonth, likesByMonth] = await Promise.all([
      prisma.$queryRaw<{ month: Date; count: number }[]>(
        Prisma.sql`
          SELECT date_trunc('month', "createdAt") as month, COUNT(*)::int as count
          FROM "User"
          WHERE "createdAt" >= ${startMonth}
            AND "email" NOT LIKE 'deleted_%'
          GROUP BY 1
          ORDER BY 1 ASC
        `
      ),
      prisma.$queryRaw<{ month: Date; count: number }[]>(
        Prisma.sql`
          SELECT date_trunc('month', "createdAt") as month, COUNT(*)::int as count
          FROM "Post"
          WHERE "createdAt" >= ${startMonth}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      ),
      prisma.$queryRaw<{ month: Date; count: number }[]>(
        Prisma.sql`
          SELECT date_trunc('month', "createdAt") as month, COUNT(*)::int as count
          FROM "Comment"
          WHERE "createdAt" >= ${startMonth}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      ),
      prisma.$queryRaw<{ month: Date; count: number }[]>(
        Prisma.sql`
          SELECT date_trunc('month', "createdAt") as month, COUNT(*)::int as count
          FROM "Reaction"
          WHERE "createdAt" >= ${startMonth}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      )
    ])

    const dailyActivity = []
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(startDaily)
      day.setDate(startDaily.getDate() + i)
      const key = formatDateKey(day)
      dailyActivity.push({ date: key, posts: 0, comments: 0, likes: 0 })
    }

    const dailyIndex = new Map(dailyActivity.map((item, index) => [item.date, index]))
    for (const row of postsByDay) {
      const key = formatDateKey(row.date)
      const index = dailyIndex.get(key)
      if (index !== undefined) dailyActivity[index].posts = Number(row.count || 0)
    }
    for (const row of commentsByDay) {
      const key = formatDateKey(row.date)
      const index = dailyIndex.get(key)
      if (index !== undefined) dailyActivity[index].comments = Number(row.count || 0)
    }
    for (const row of likesByDay) {
      const key = formatDateKey(row.date)
      const index = dailyIndex.get(key)
      if (index !== undefined) dailyActivity[index].likes = Number(row.count || 0)
    }

    const monthBuckets = []
    for (let i = monthsToShow - 1; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthBuckets.push({
        month: formatMonthKey(date),
        members: 0,
        posts: 0,
        engagement: 0,
      })
    }
    const monthIndex = new Map(monthBuckets.map((item, index) => [item.month, index]))

    for (const row of membersByMonth) {
      const key = formatMonthKey(row.month)
      const index = monthIndex.get(key)
      if (index !== undefined) monthBuckets[index].members = Number(row.count || 0)
    }
    for (const row of postsByMonth) {
      const key = formatMonthKey(row.month)
      const index = monthIndex.get(key)
      if (index !== undefined) monthBuckets[index].posts = Number(row.count || 0)
    }
    for (const row of commentsByMonth) {
      const key = formatMonthKey(row.month)
      const index = monthIndex.get(key)
      if (index !== undefined) monthBuckets[index].engagement += Number(row.count || 0)
    }
    for (const row of likesByMonth) {
      const key = formatMonthKey(row.month)
      const index = monthIndex.get(key)
      if (index !== undefined) monthBuckets[index].engagement += Number(row.count || 0)
    }

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
        postsCount: Number(t.posts || 0),
        membersCount: Number(t.members || 0),
      })),
      dailyActivity,
      monthlyGrowth: monthBuckets,
    })
  } catch (e) {
    console.error('GET /api/community/stats error', e)
    return NextResponse.json({ error: 'Erro ao obter estatísticas' }, { status: 500 })
  }
}
