import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'

const createModuleSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const body = await request.json()
    const data = createModuleSchema.parse(body)

    const course = await prisma.course.findUnique({ where: { id: params.id } })
    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
    }

    const lastModule = await prisma.module.findFirst({
      where: { courseId: params.id },
      orderBy: { order: 'desc' }
    })

    const newModule = await prisma.module.create({
      data: {
        courseId: params.id,
        title: data.title,
        description: data.description ?? null,
        order: (lastModule?.order ?? 0) + 1,
      }
    })

    return NextResponse.json({ success: true, module: newModule }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/admin/courses/[id]/modules error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
