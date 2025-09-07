import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// Toggle reaction (default: LIKE)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id
    const body = await req.json().catch(() => ({}))
    const type = (body.type as string) || 'LIKE'

    const post = await prisma.post.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

    const existing = await prisma.reaction.findUnique({ where: { userId_postId_type: { userId, postId: params.id, type } } })
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      return NextResponse.json({ liked: false })
    } else {
      await prisma.reaction.create({ data: { userId, postId: params.id, type } })
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Erro ao reagir ao post:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

