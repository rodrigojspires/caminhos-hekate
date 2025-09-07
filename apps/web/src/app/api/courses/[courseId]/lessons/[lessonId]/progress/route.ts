import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(req: NextRequest, { params }: { params: { courseId: string, lessonId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const { courseId, lessonId } = params
    const body = await req.json().catch(() => ({}))
    const time: number | undefined = typeof body.time === 'number' ? body.time : undefined
    const completed: boolean | undefined = typeof body.completed === 'boolean' ? body.completed : undefined

    // Validate lesson belongs to course
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, module: { courseId } },
      select: { id: true, isFree: true, module: { select: { course: { select: { tier: true } } } } }
    })
    if (!lesson) {
      return NextResponse.json({ error: 'Lição não encontrada' }, { status: 404 })
    }

    // Enforce tier gate
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }
    const requiredTier = lesson.module.course.tier as keyof typeof order
    const allowedByTier = order[(user?.subscriptionTier as keyof typeof order) || 'FREE'] >= order[requiredTier]
    if (!allowedByTier) {
      return NextResponse.json({ error: 'Nível de assinatura insuficiente' }, { status: 403 })
    }

    // Enforce enrollment for non-free lessons
    if (!lesson.isFree) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true }
      })
      if (!enrollment) {
        return NextResponse.json({ error: 'Inscrição necessária para registrar progresso' }, { status: 403 })
      }
    }

    const data: any = {}
    if (typeof time === 'number') data.videoTime = Math.max(0, Math.floor(time))
    if (typeof completed === 'boolean') {
      data.completed = completed
      data.completedAt = completed ? new Date() : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true })
    }

    await prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, ...data },
      update: { ...data }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
