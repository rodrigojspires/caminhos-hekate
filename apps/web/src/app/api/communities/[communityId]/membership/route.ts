import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { isMembershipActive } from '@/lib/community-membership'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

export async function GET(_req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ enrolled: false })
    }

    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: params.communityId, userId: session.user.id } },
      select: { status: true, paidUntil: true }
    })

    return NextResponse.json({
      enrolled: isMembershipActive(membership),
      status: membership?.status || null,
      paidUntil: membership?.paidUntil || null
    })
  } catch (error) {
    return NextResponse.json({ enrolled: false })
  }
}

export async function POST(_req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const community = await prisma.community.findUnique({
      where: { id: params.communityId },
      select: { id: true, tier: true, accessModels: true }
    })

    if (!community) {
      return NextResponse.json({ error: 'Comunidade não encontrada' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true }
    })

    const accessModels = community.accessModels as string[]
    const isFree = accessModels.includes('FREE')
    const hasSubscription = accessModels.includes('SUBSCRIPTION')
    const allowedBySubscription = hasSubscription && tierOrder[user?.subscriptionTier || 'FREE'] >= tierOrder[community.tier]
    const isPaidCommunity = accessModels.includes('ONE_TIME')

    const targetStatus = (isFree || allowedBySubscription) ? 'active' : 'pending'

    const existing = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: session.user.id } },
      select: { id: true, status: true }
    })

    if (existing) {
      if (existing.status !== targetStatus) {
        await prisma.communityMembership.update({ where: { id: existing.id }, data: { status: targetStatus } })
      }
      return NextResponse.json({ enrolled: true, status: targetStatus })
    }

    const createdMembership = await prisma.communityMembership.create({
      data: { communityId: community.id, userId: session.user.id, status: targetStatus }
    })

    return NextResponse.json({ enrolled: true, status: targetStatus })
  } catch (error) {
    console.error('Erro ao inscrever na comunidade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { communityId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const membership = await prisma.communityMembership.findUnique({
      where: { communityId_userId: { communityId: params.communityId, userId: session.user.id } },
      select: { id: true, status: true, paidUntil: true }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    if (membership.status === 'pending') {
      await prisma.communityMembership.delete({ where: { id: membership.id } })
      return NextResponse.json({ cancelled: true, status: 'cancelled' })
    }

    const community = await prisma.community.findUnique({
      where: { id: params.communityId },
      select: { accessModels: true }
    })
    if (!community) {
      return NextResponse.json({ error: 'Comunidade não encontrada' }, { status: 404 })
    }

    const accessModels = community.accessModels as string[]
    const isPaidCommunity = accessModels.includes('ONE_TIME')

    if (isPaidCommunity) {
      const now = new Date()
      const paidUntil = membership.paidUntil || now
      await prisma.communityMembership.update({
        where: { id: membership.id },
        data: { status: 'cancelled', cancelledAt: now, paidUntil }
      })
      return NextResponse.json({ cancelled: true, status: 'cancelled', paidUntil })
    }

    await prisma.communityMembership.delete({ where: { id: membership.id } })
    return NextResponse.json({ cancelled: true, status: 'cancelled' })
  } catch (error) {
    console.error('Erro ao cancelar inscrição na comunidade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
