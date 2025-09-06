import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { validateAchievementCriteriaJSON } from '@/lib/gamification/criteria-schemas'

function ensureAdmin(user: any) {
  return user && (user.role === 'ADMIN' || user.role === 'EDITOR')
}

// GET /api/admin/gamification/achievements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const rarity = searchParams.get('rarity')
    const categoryId = searchParams.get('categoryId')
    const q = searchParams.get('q')

    const where: any = {}
    if (isActive === 'true') where.isActive = true
    if (isActive === 'false') where.isActive = false
    if (rarity) where.rarity = rarity
    if (categoryId) where.categoryId = categoryId
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]

    const achievements = await prisma.achievement.findMany({
      where,
      include: { category: true },
      orderBy: [{ createdAt: 'desc' }]
    })

    return NextResponse.json({ data: achievements })
  } catch (error) {
    console.error('Erro ao listar conquistas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/admin/gamification/achievements
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { name, description, icon, categoryId, rarity, points, isActive, criteria, metadata, rewards } = await request.json()
    if (!name || !description || !categoryId) {
      return NextResponse.json({ error: 'name, description e categoryId são obrigatórios' }, { status: 400 })
    }

    // Validate criteria JSON (if provided)
    let validatedCriteria: any = {}
    try {
      if (criteria && Object.keys(criteria).length > 0) {
        validatedCriteria = validateAchievementCriteriaJSON(criteria)
      }
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Criteria inválido' }, { status: 400 })
    }

    const created = await prisma.achievement.create({
      data: {
        name,
        description,
        icon,
        categoryId,
        rarity: rarity || 'COMMON',
        points: points ?? 0,
        isActive: isActive ?? true,
        criteria: validatedCriteria ?? {},
        metadata: metadata ?? null,
        // Optional nested rewards creation
        ...(Array.isArray(rewards) && rewards.length
          ? {
              rewards: {
                create: rewards.map((r: any) => ({
                  rewardType: r.rewardType,
                  rewardValue: Number(r.rewardValue) || 0,
                  description: r.description || null,
                  isActive: r.isActive !== false,
                  metadata: r.metadata || undefined,
                })),
              },
            }
          : {}),
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar conquista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
