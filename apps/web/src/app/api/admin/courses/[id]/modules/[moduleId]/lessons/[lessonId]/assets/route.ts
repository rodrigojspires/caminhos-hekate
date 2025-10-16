import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'

const createAssetSchema = z.object({
  title: z.string().min(1).optional(),
  url: z.string().min(1, 'URL do arquivo é obrigatória'),
  type: z.string().optional(),
  size: z.number().int().nonnegative().optional()
})

interface RouteParams {
  params: {
    id: string
    moduleId: string
    lessonId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: params.lessonId,
        moduleId: params.moduleId,
        module: { courseId: params.id }
      },
      select: { id: true, title: true }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const data = createAssetSchema.parse(body)

    const existingCount = await prisma.asset.count({
      where: { lessonId: lesson.id }
    })

    const asset = await prisma.asset.create({
      data: {
        lessonId: lesson.id,
        title: data.title ?? data.url.split('/').pop() ?? 'Material da aula',
        type: data.type ?? 'file',
        url: data.url,
        size: data.size ?? null,
        order: existingCount + 1
      }
    })

    return NextResponse.json({ success: true, asset }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/assets error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
