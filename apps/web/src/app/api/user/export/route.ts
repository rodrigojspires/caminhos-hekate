import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function POST(req: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const userId = session.user.id

    const [user, accounts, orders, subs, txs, downloads, enrollments, certs, posts, comments, notifications, pref, uiprefs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.order.findMany({ where: { userId }, include: { items: true, payments: true } }),
      prisma.userSubscription.findMany({ where: { userId }, include: { plan: true } }),
      prisma.paymentTransaction.findMany({ where: { userId } }),
      prisma.download.findMany({ where: { userId } }),
      prisma.enrollment.findMany({ where: { userId } }),
      prisma.certificate.findMany({ where: { userId } }),
      prisma.post.findMany({ where: { authorId: userId } }),
      prisma.comment.findMany({ where: { authorId: userId } }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.notificationPreference.findUnique({ where: { userId } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ])

    const exported = {
      generatedAt: new Date().toISOString(),
      user,
      accounts,
      orders,
      subscriptions: subs,
      transactions: txs,
      downloads,
      enrollments,
      certificates: certs,
      posts,
      comments,
      notifications,
      notificationPreference: pref,
      uiPreferences: uiprefs,
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_EXPORT',
        entity: 'User',
        entityId: userId,
        metadata: { size: JSON.stringify(exported).length },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    })

    const body = JSON.stringify(exported, null, 2)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="export-${userId}.json"`,
      },
    })
  } catch (e) {
    console.error('POST /api/user/export error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
