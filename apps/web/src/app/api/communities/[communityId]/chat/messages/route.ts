import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: params.communityId, userId } },
      select: { status: true }
    })
    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Number(searchParams.get('limit') || '50'))
    const before = searchParams.get('before')

    const where: any = { communityId: params.communityId }
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }

    const messages = await prisma.communityMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, name: true, image: true } }
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Erro ao listar mensagens da comunidade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: params.communityId, userId } },
      select: { status: true }
    })
    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const content = String(body.content || '').trim()
    if (!content) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

    const message = await prisma.communityMessage.create({
      data: {
        communityId: params.communityId,
        authorId: userId,
        content
      },
      include: { author: { select: { id: true, name: true, image: true } } }
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar mensagem da comunidade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
