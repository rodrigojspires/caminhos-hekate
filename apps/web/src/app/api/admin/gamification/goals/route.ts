import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

function ensureAdmin(user: { role?: string } | null) {
  return user && (user.role === 'ADMIN' || user.role === 'EDITOR')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const q = searchParams.get('q')

    const where: any = {}
    if (isActive === 'true') where.isActive = true
    if (isActive === 'false') where.isActive = false
    if (q) where.title = { contains: q, mode: 'insensitive' }

    const goals = await prisma.gamificationGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        achievement: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Erro ao listar metas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const {
      title,
      description,
      goalType,
      metric,
      targetValue,
      startDate,
      endDate,
      rewardMode,
      points,
      achievementId,
      isActive
    } = body

    if (!title || !goalType || !metric || !targetValue || !startDate || !endDate) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const created = await prisma.gamificationGoal.create({
      data: {
        title,
        description: description || null,
        goalType,
        metric,
        targetValue: Number(targetValue),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rewardMode: rewardMode || 'BOTH',
        points: Number(points || 0),
        achievementId: achievementId || null,
        isActive: isActive !== false
      }
    })

    return NextResponse.json({ goal: created }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar meta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { id, ...payload } = body

    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const updated = await prisma.gamificationGoal.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description ?? null,
        goalType: payload.goalType,
        metric: payload.metric,
        targetValue: payload.targetValue != null ? Number(payload.targetValue) : undefined,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
        rewardMode: payload.rewardMode ?? undefined,
        points: payload.points != null ? Number(payload.points) : undefined,
        achievementId: payload.achievementId ?? null,
        isActive: payload.isActive
      }
    })

    return NextResponse.json({ goal: updated })
  } catch (error) {
    console.error('Erro ao atualizar meta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    await prisma.gamificationGoal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar meta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
