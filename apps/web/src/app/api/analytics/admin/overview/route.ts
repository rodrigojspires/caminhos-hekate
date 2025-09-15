import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + delta)
  return d
}

// GET /api/analytics/admin/overview
export async function GET(_request: NextRequest) {
  try {
    const now = new Date()
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thisMonthStart = startOfMonth(now)
    const prevMonthStart = startOfMonth(addMonths(now, -1))
    const prevMonthEnd = new Date(thisMonthStart.getTime() - 1)

    // Users metrics
    const baseUserFilter = { NOT: { email: { startsWith: 'deleted_' } } } as const

    const [usersTotal, activeUserIds, newThisMonth] = await Promise.all([
      prisma.user.count({ where: baseUserFilter }),
      prisma.loginHistory.findMany({
        where: { createdAt: { gte: last30 } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.user.count({ where: { ...baseUserFilter, createdAt: { gte: thisMonthStart } } }),
    ])
    const activeIds = activeUserIds.map(u => u.userId).filter((id): id is string => !!id)
    const usersActive = activeIds.length
      ? await prisma.user.count({ where: { ...baseUserFilter, id: { in: activeIds } } })
      : 0
    const retentionRate = usersTotal > 0 ? usersActive / usersTotal : 0

    // Courses metrics
    const [coursesTotal, coursesPublished] = await Promise.all([
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
    ])

    // Approx. average completion: completed progresses / total lessons (guard)
    const [completedProgressCount, totalLessons] = await Promise.all([
      prisma.progress.count({ where: { completed: true } }),
      prisma.lesson.count(),
    ])
    const averageCompletion = totalLessons > 0 ? (completedProgressCount / totalLessons) * 100 : 0

    // Most popular courses (by enrollments)
    const popularEnrollments = await prisma.enrollment.groupBy({
      by: ['courseId'],
      _count: { courseId: true },
      orderBy: { _count: { courseId: 'desc' } },
      take: 5,
    })
    const popularCourseIds = popularEnrollments.map((e) => e.courseId)
    const popularCourses = await prisma.course.findMany({
      where: { id: { in: popularCourseIds } },
      select: { id: true, title: true, slug: true },
    })

    // Revenue metrics via PaymentTransaction
    const [revenueAll, revenueThisMonth, revenuePrevMonth] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.paymentTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: thisMonthStart },
        },
        _sum: { amount: true },
      }),
      prisma.paymentTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { amount: true },
      }),
    ])

    const totalRevenue = Number(revenueAll._sum.amount || 0)
    const thisMonthRevenue = Number(revenueThisMonth._sum.amount || 0)
    const prevMonthRevenue = Number(revenuePrevMonth._sum.amount || 0)
    const growth = prevMonthRevenue > 0 ? (thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue : 1

    // Top products by sales (order items)
    const topItems = await prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      _sum: { total: true, quantity: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })
    const topProducts = topItems.map((i) => ({
      productId: i.productId,
      name: i.name,
      revenue: Number(i._sum.total || 0),
      quantity: i._sum.quantity || 0,
    }))

    // Community metrics
    const [totalPosts, totalComments, recentPostsAuthors, recentCommentsAuthors] = await Promise.all([
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.comment.count(),
      prisma.post.findMany({
        where: { createdAt: { gte: last30 }, status: 'PUBLISHED' },
        select: { authorId: true },
        distinct: ['authorId'],
      }),
      prisma.comment.findMany({
        where: { createdAt: { gte: last30 } },
        select: { authorId: true },
        distinct: ['authorId'],
      }),
    ])
    const authorIds = Array.from(new Set([
      ...recentPostsAuthors.map((a) => a.authorId),
      ...recentCommentsAuthors.map((a) => a.authorId),
    ].filter((id): id is string => !!id)))
    const communityActiveUsers = authorIds.length
      ? await prisma.user.count({ where: { ...baseUserFilter, id: { in: authorIds } } })
      : 0
    const engagementRate = usersTotal > 0 ? communityActiveUsers / usersTotal : 0

    const payload = {
      users: {
        total: usersTotal,
        active: usersActive,
        newThisMonth,
        retentionRate,
      },
      courses: {
        total: coursesTotal,
        published: coursesPublished,
        averageCompletion,
        mostPopular: popularCourses.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          enrollments: popularEnrollments.find((e) => e.courseId === c.id)?._count.courseId || 0,
        })),
      },
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        growth,
        topProducts,
      },
      community: {
        totalPosts,
        totalComments,
        activeUsers: communityActiveUsers,
        engagementRate,
      },
      generatedAt: now.toISOString(),
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao gerar overview de analytics admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
