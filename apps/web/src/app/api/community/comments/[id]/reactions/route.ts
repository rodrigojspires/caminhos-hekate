import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// Toggle reaction (default: LIKE) for a comment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id
    const body = await req.json().catch(() => ({}))
    const type = (body.type as string) || 'LIKE'

    const comment = await prisma.comment.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!comment) return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 })

    const existing = await prisma.reaction.findUnique({ where: { userId_commentId_type: { userId, commentId: params.id, type } } })
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      return NextResponse.json({ reacted: false })
    } else {
      await prisma.reaction.create({ data: { userId, commentId: params.id, type } })
      return NextResponse.json({ reacted: true })
    }
  } catch (error) {
    console.error('Erro ao reagir ao comentário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

