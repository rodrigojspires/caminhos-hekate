import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

function ensureAdmin(user: any) {
  return user && (user.role === 'ADMIN' || user.role === 'EDITOR')
}

// PUT /api/admin/gamification/categories/[id]
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

    const updated = await prisma.achievementCategory.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        order: typeof body.order === 'number' ? body.order : undefined,
      }
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/admin/gamification/categories/[id]
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
    await prisma.achievementCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar categoria:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

