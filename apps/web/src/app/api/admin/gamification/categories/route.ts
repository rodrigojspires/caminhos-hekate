import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

function ensureAdmin(user: any) {
  return user && (user.role === 'ADMIN' || user.role === 'EDITOR')
}

// GET /api/admin/gamification/categories
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const categories = await prisma.achievementCategory.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error('Erro ao listar categorias de conquistas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/admin/gamification/categories
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { name, description, icon, color, order } = await request.json()
    if (!name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })

    const created = await prisma.achievementCategory.create({
      data: {
        name,
        description: description || null,
        icon: icon || null,
        color: color || null,
        order: typeof order === 'number' ? order : 0,
      }
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
