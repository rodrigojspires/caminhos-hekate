import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const permission = await checkAdminPermission()
    if (permission) {
      return NextResponse.json({ error: permission.error }, { status: permission.status })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: params.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.enrollment.count({ where: { courseId: params.id } })
    ])

    return NextResponse.json({
      enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('GET /api/admin/courses/[id]/enrollments error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
