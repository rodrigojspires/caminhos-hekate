import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
    moduleId: string
    lessonId: string
    assetId: string
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.assetId,
        lessonId: params.lessonId,
        lesson: {
          moduleId: params.moduleId,
          module: { courseId: params.id }
        }
      },
      select: { id: true }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    await prisma.asset.delete({ where: { id: asset.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/assets/[assetId] error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
