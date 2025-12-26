import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL
let redis: IORedis | null = null

const getRedis = () => {
  if (!REDIS_URL) return null
  if (!redis) {
    redis = new IORedis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null })
  }
  return redis
}

export async function POST(req: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const body = await req.json().catch(() => ({}))
    const token = body?.confirmToken as string | undefined
    if (!token) return NextResponse.json({ error: 'Token de confirmação ausente' }, { status: 400 })
    const client = getRedis()
    if (!client) return NextResponse.json({ error: 'Redis não configurado' }, { status: 503 })
    if (client.status === 'wait' || client.status === 'end') {
      await client.connect()
    }
    const stored = await client.get(`delete:${userId}`)
    if (!stored || stored !== token) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 })

    await prisma.user.update({
      where: { id: userId },
      data: ({
        email: `deleted_${userId}@example.com`,
        name: null,
        image: null,
        bio: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        role: 'VISITOR',
      } as any),
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_DELETE_CONFIRM',
        entity: 'User',
        entityId: userId,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    })

    await client.del(`delete:${userId}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/user/delete error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
