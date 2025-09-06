import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { validateAchievementCriteriaJSON } from '@/lib/gamification/criteria-schemas'

function ensureAdmin(user: any) {
  return user && (user.role === 'ADMIN' || user.role === 'EDITOR')
}

// PUT /api/admin/gamification/achievements/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { id } = params
    const body = await request.json()

    // Optional criteria validation
    let validatedCriteria: any = {}
    try {
      if (body.criteria && Object.keys(body.criteria).length > 0) {
        validatedCriteria = validateAchievementCriteriaJSON(body.criteria)
      }
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Criteria inválido' }, { status: 400 })
    }

    const updated = await prisma.achievement.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        icon: body.icon,
        categoryId: body.categoryId,
        rarity: body.rarity,
        points: body.points,
        isActive: body.isActive,
        criteria: validatedCriteria ?? {},
        metadata: body.metadata,
      }
    })

    // Replace rewards if provided
    if (Array.isArray(body.rewards)) {
      await prisma.$transaction([
        prisma.achievementReward.deleteMany({ where: { achievementId: id } }),
        ...(body.rewards.length
          ? [
              prisma.achievementReward.createMany({
                data: body.rewards.map((r: any) => ({
                  achievementId: id,
                  rewardType: r.rewardType,
                  rewardValue: Number(r.rewardValue) || 0,
                  description: r.description || null,
                  isActive: r.isActive !== false,
                  metadata: r.metadata || undefined,
                })),
              }),
            ]
          : []),
      ])
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Erro ao atualizar conquista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/admin/gamification/achievements/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { id } = params
    await prisma.achievement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar conquista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// GET /api/admin/gamification/achievements/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { id } = params
    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: { rewards: true, category: true }
    })

    if (!achievement) return NextResponse.json({ error: 'Conquista não encontrada' }, { status: 404 })
    return NextResponse.json({ data: achievement })
  } catch (error) {
    console.error('Erro ao buscar conquista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
