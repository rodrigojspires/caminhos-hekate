import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'

const updateModuleSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').optional(),
  description: z.string().nullable().optional(),
  order: z.number().int().optional(),
})

interface RouteParams {
  params: {
    id: string
    moduleId: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const body = await request.json()
    const data = updateModuleSchema.parse(body)

    const courseModule = await prisma.module.findFirst({
      where: { id: params.moduleId, courseId: params.id }
    })

    if (!courseModule) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }

    let newOrder = courseModule.order
    if (data.order !== undefined && data.order !== courseModule.order) {
      // ajustar ordem
      const modules = await prisma.module.findMany({
        where: { courseId: params.id },
        orderBy: { order: 'asc' }
      })

      const reordered = modules
        .filter((item) => item.id !== courseModule.id)
        .map((item) => item.id)

      const targetIndex = Math.max(0, Math.min(data.order - 1, reordered.length))
      reordered.splice(targetIndex, 0, courseModule.id)

      await Promise.all(
        reordered.map((moduleId, index) =>
          prisma.module.update({
            where: { id: moduleId },
            data: { order: index + 1 }
          })
        )
      )

      newOrder = targetIndex + 1
    }

    const updatedModule = await prisma.module.update({
      where: { id: courseModule.id },
      data: {
        title: data.title ?? courseModule.title,
        description: data.description !== undefined ? data.description : courseModule.description,
        order: newOrder,
      }
    })

    return NextResponse.json({ success: true, module: updatedModule })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('PUT /api/admin/courses/[id]/modules/[moduleId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const courseModule = await prisma.module.findFirst({
      where: { id: params.moduleId, courseId: params.id },
      select: { id: true }
    })

    if (!courseModule) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }

    await prisma.module.delete({ where: { id: courseModule.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/courses/[id]/modules/[moduleId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
