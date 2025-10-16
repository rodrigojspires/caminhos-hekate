import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'

const updateLessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  videoDuration: z.number().int().nullable().optional(),
  isFree: z.boolean().optional(),
  order: z.number().int().optional(),
})

interface RouteParams {
  params: {
    id: string
    moduleId: string
    lessonId: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const body = await request.json()
    const data = updateLessonSchema.parse(body)

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.lessonId, moduleId: params.moduleId, module: { courseId: params.id } }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })
    }

    let newOrder = lesson.order
    if (data.order !== undefined && data.order !== lesson.order) {
      const lessons = await prisma.lesson.findMany({
        where: { moduleId: params.moduleId },
        orderBy: { order: 'asc' }
      })

      const reordered = lessons
        .filter((item) => item.id !== lesson.id)
        .map((item) => item.id)

      const targetIndex = Math.max(0, Math.min(data.order - 1, reordered.length))
      reordered.splice(targetIndex, 0, lesson.id)

      await Promise.all(
        reordered.map((lessonId, index) =>
          prisma.lesson.update({
            where: { id: lessonId },
            data: { order: index + 1 }
          })
        )
      )

      newOrder = targetIndex + 1
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        title: data.title ?? lesson.title,
        description: data.description !== undefined ? data.description : lesson.description,
        content: data.content !== undefined ? data.content : lesson.content,
        videoUrl: data.videoUrl !== undefined ? data.videoUrl : lesson.videoUrl,
        videoDuration: data.videoDuration !== undefined ? data.videoDuration : lesson.videoDuration,
        isFree: data.isFree ?? lesson.isFree,
        order: newOrder,
      }
    })

    return NextResponse.json({ success: true, lesson: updatedLesson })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('PUT /api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const lesson = await prisma.lesson.findFirst({
      where: { id: params.lessonId, moduleId: params.moduleId, module: { courseId: params.id } },
      select: { id: true }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })
    }

    await prisma.lesson.delete({ where: { id: lesson.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
