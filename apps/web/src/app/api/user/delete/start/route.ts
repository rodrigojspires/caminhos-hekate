import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import IORedis from 'ioredis'

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function POST(req: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const token = Math.random().toString(36).slice(2, 8).toUpperCase()
    await redis.setex(`delete:${userId}`, 900, token) // 15 minutos

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_DELETE_START',
        entity: 'User',
        entityId: userId,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    })

    // Obs: Em produção, envie este token por email para confirmação
    return NextResponse.json({ success: true, token })
  } catch (e) {
    console.error('POST /api/user/delete/start error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
