import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

async function canAccessTopic(topicId: string, userId: string | null) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      communityId: true,
      community: { select: { accessModels: true, tier: true } }
    }
  })
  if (!topic) return { ok: false, topic: null }
  if (!topic.communityId || !topic.community) return { ok: true, topic }
  if (!userId) return { ok: false, topic }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  })
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId: topic.communityId, userId } },
    select: { status: true }
  })
  const accessModels = (topic.community.accessModels || []) as string[]
  const isFree = accessModels.includes('FREE')
  const isSubscription = accessModels.includes('SUBSCRIPTION')
  const allowedByTier = isSubscription && tierOrder[user?.subscriptionTier || 'FREE'] >= tierOrder[topic.community.tier]
  const ok = isFree || allowedByTier || membership?.status === 'active'
  return { ok, topic }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const access = await canAccessTopic(params.id, session?.user?.id || null)
    if (!access.topic) return NextResponse.json({ error: 'Tópico inexistente' }, { status: 404 })
    if (!access.ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const comments = await prisma.topicComment.findMany({
      where: { topicId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, image: true } }
      }
    })
    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Erro ao listar comentários do tópico:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, _params: { params: { id: string } }) {
  return NextResponse.json({ error: 'Comentários em categorias estão desativados' }, { status: 403 })
}

export async function PATCH(_req: NextRequest, _params: { params: { id: string } }) {
  return NextResponse.json({ error: 'Comentários em categorias estão desativados' }, { status: 403 })
}

export async function DELETE(_req: NextRequest, _params: { params: { id: string } }) {
  return NextResponse.json({ error: 'Comentários em categorias estão desativados' }, { status: 403 })
}
