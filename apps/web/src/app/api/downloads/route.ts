import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const { user } = await requireAuth()
    const downloads = await prisma.download.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        token: true,
        expiresAt: true,
        downloadCount: true,
        maxDownloads: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ downloads })
  } catch (error) {
    console.error('GET /api/downloads error', error)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

