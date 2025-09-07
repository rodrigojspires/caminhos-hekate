import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

  try {
    const now = new Date()

    const dl = await prisma.download.findUnique({ where: { token } })
    if (!dl) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    if (dl.expiresAt <= now) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
    }

    if (dl.downloadCount >= dl.maxDownloads) {
      return NextResponse.json({ error: 'Limite de downloads atingido' }, { status: 429 })
    }

    await prisma.download.update({
      where: { token },
      data: { downloadCount: { increment: 1 } },
    })

    // Redireciona ao arquivo real
    return NextResponse.redirect(dl.fileUrl)
  } catch (error) {
    console.error('GET /api/downloads/[token] error', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

