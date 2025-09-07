import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ enrolled: false })
    }
    const userId = session.user.id
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: params.courseId } },
      select: { id: true }
    })
    return NextResponse.json({ enrolled: !!enrollment })
  } catch (e) {
    return NextResponse.json({ enrolled: false })
  }
}

export async function POST(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = session.user.id

    const course = await prisma.course.findUnique({ where: { id: params.courseId }, select: { id: true, tier: true, price: true } })
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
    }

    // Regra simples: permitir auto-inscrição apenas em cursos FREE por enquanto
    if (course.tier !== 'FREE') {
      return NextResponse.json({ error: 'Inscrição automática indisponível para este curso' }, { status: 403 })
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { id: true }
    })
    if (existing) return NextResponse.json({ enrolled: true })

    await prisma.enrollment.create({ data: { userId, courseId: course.id } })
    return NextResponse.json({ enrolled: true })
  } catch (error) {
    console.error('Erro ao inscrever no curso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

