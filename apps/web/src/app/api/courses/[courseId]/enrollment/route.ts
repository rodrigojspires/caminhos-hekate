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
      select: { id: true, status: true }
    })
    return NextResponse.json({ enrolled: !!enrollment, status: enrollment?.status || null })
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

    const course = await prisma.course.findUnique({ where: { id: params.courseId }, select: { id: true, tier: true, accessModels: true } })
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
    }

    // Verifica se assinatura do usuário cobre o curso
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }
    const allowedBySubscription = (order[(user?.subscriptionTier as keyof typeof order) || 'FREE'] || 0) >= ((order[course.tier as keyof typeof order]) || 0)

    // Determina status inicial da inscrição
    const isFreeCourse = course.tier === 'FREE' || (Array.isArray(course.accessModels) && course.accessModels.includes('FREE'))
    const targetStatus = isFreeCourse || allowedBySubscription ? 'active' : 'pending'

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { id: true, status: true }
    })

    if (existing) {
      if (existing.status !== targetStatus) {
        await prisma.enrollment.update({ where: { id: existing.id }, data: { status: targetStatus } })
      }
      return NextResponse.json({ enrolled: true, status: targetStatus })
    }

    await prisma.enrollment.create({ data: { userId, courseId: course.id, status: targetStatus } })
    return NextResponse.json({ enrolled: true, status: targetStatus })
  } catch (error) {
    console.error('Erro ao inscrever no curso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

