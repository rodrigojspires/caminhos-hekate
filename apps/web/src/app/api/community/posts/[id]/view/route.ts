import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { cookies } from 'next/headers'

const VIEW_SESSION_COOKIE = 'view_session'
const USER_TTL_MS = 24 * 60 * 60 * 1000
const ANON_TTL_MS = 12 * 60 * 60 * 1000

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const now = new Date()
    const ttlMs = userId ? USER_TTL_MS : ANON_TTL_MS
    const since = new Date(now.getTime() - ttlMs)

    const cookieStore = cookies()
    let sessionId = cookieStore.get(VIEW_SESSION_COOKIE)?.value || null
    if (!sessionId) {
      sessionId = crypto.randomUUID()
    }

    const existing = await prisma.analyticsEvent.findFirst({
      where: {
        name: 'community_post_view',
        action: 'view',
        label: params.id,
        timestamp: { gte: since },
        ...(userId ? { userId } : { sessionId })
      },
      select: { id: true }
    })

    const response = NextResponse.json({ counted: !existing })
    if (!cookieStore.get(VIEW_SESSION_COOKIE)) {
      response.cookies.set(VIEW_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      })
    }

    if (existing) {
      return response
    }

    await prisma.$transaction([
      prisma.post.update({
        where: { id: params.id },
        data: { viewCount: { increment: 1 } }
      }),
      prisma.analyticsEvent.create({
        data: {
          name: 'community_post_view',
          category: 'community',
          action: 'view',
          label: params.id,
          userId: userId || null,
          sessionId: userId ? null : sessionId,
          page: `/comunidade/post/${params.id}`,
          properties: { postId: params.id }
        }
      })
    ])

    return response
  } catch (error) {
    console.error('Erro ao registrar visualização do post:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
