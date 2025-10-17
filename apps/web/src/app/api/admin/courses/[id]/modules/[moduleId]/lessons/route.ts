import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'

const lessonAssetSchema = z.object({
  title: z.string().optional(),
  url: z.string().min(1, 'URL do arquivo é obrigatória'),
  type: z.string().optional(),
  size: z.number().int().nonnegative().nullable().optional()
})

const createLessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  videoStorage: z
    .object({
      url: z.string().optional(),
      filename: z.string().optional(),
      size: z.number().optional(),
      type: z.string().optional()
    })
    .nullable()
    .optional(),
  videoDuration: z.number().int().nullable().optional(),
  isFree: z.boolean().optional(),
  assets: z.array(lessonAssetSchema).optional()
})

interface RouteParams {
  params: {
    id: string
    moduleId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const body = await request.json()
    const data = createLessonSchema.parse(body)

    const courseModule = await prisma.module.findFirst({
      where: { id: params.moduleId, courseId: params.id }
    })
    if (!courseModule) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId: courseModule.id },
      orderBy: { order: 'desc' }
    })

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: courseModule.id,
        title: data.title,
        description: data.description ?? null,
        content: data.content ?? null,
        videoUrl: data.videoUrl ?? null,
        videoStorage: data.videoStorage != null ? (data.videoStorage as Prisma.InputJsonValue) : Prisma.DbNull,
        videoDuration: data.videoDuration ?? null,
        isFree: data.isFree ?? false,
        order: (lastLesson?.order ?? 0) + 1,
      }
    })

    if (data.assets && data.assets.length > 0) {
      const assetsData = data.assets.map((asset, index) => ({
        lessonId: lesson.id,
        title: asset.title?.trim() || asset.url.split('/').pop() || 'Material da aula',
        type: asset.type ?? 'file',
        url: asset.url,
        size: asset.size != null ? Math.round(asset.size) : null,
        order: index + 1
      }))

      if (assetsData.length > 0) {
        await prisma.asset.createMany({ data: assetsData })
      }
    }

    return NextResponse.json({ success: true, lesson }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/admin/courses/[id]/modules/[moduleId]/lessons error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
