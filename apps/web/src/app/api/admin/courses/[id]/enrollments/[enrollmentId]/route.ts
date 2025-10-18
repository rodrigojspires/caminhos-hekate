import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
    enrollmentId: string
  }
}

// DELETE /api/admin/courses/[id]/enrollments/[enrollmentId] - Remover inscrição de um aluno no curso
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const { id: courseId, enrollmentId } = params

    // Buscar inscrição e validar relação com o curso
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, userId: true, courseId: true }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    if (enrollment.courseId !== courseId) {
      return NextResponse.json({ error: 'Inscrição não pertence a este curso' }, { status: 400 })
    }

    // Buscar todas as lições do curso para limpar progresso do usuário
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true }
    })
    const lessonIds = lessons.map(l => l.id)

    if (lessonIds.length > 0) {
      await prisma.progress.deleteMany({
        where: {
          userId: enrollment.userId,
          lessonId: { in: lessonIds }
        }
      })
    }

    // Remover a inscrição
    await prisma.enrollment.delete({ where: { id: enrollmentId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/courses/[id]/enrollments/[enrollmentId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string; enrollmentId: string } }) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const { id: courseId, enrollmentId } = params

    const body = await request.json().catch(() => ({})) as { status?: string }
    const requestedStatus = (body.status || 'inactive').toLowerCase()

    const allowedStatuses = new Set(['active', 'inactive', 'pending', 'paused', 'canceled', 'cancelled'])
    if (!allowedStatuses.has(requestedStatus)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, courseId: true, status: true }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    if (enrollment.courseId !== courseId) {
      return NextResponse.json({ error: 'Inscrição não pertence a este curso' }, { status: 400 })
    }

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: requestedStatus }
    })

    return NextResponse.json({ success: true, status: requestedStatus })
  } catch (error) {
    console.error('PATCH /api/admin/courses/[id]/enrollments/[enrollmentId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}