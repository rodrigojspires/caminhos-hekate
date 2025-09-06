import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'
import { CourseStatus, CourseLevel } from '@hekate/database'

// Schema de validação para atualização de curso
const updateCourseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').optional(),
  slug: z.string().min(1, 'Slug é obrigatório').optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0').optional(),
  status: z.nativeEnum(CourseStatus).optional(),
  featured: z.boolean().optional(),
  featuredImage: z.string().url().optional(),
  introVideo: z.string().url().optional(),
  duration: z.number().min(0).optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  maxStudents: z.number().min(1).optional()
})



// Gerar slug único
async function generateUniqueSlug(title: string, excludeId?: string) {
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.course.findFirst({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } })
      }
    })

    if (!existing) break
    
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/courses/[id] - Buscar curso específico
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        modules: {
          include: {
            lessons: true
          },
          orderBy: { order: 'asc' }
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            enrollments: true,
            modules: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(course)

  } catch (error) {
    console.error('Erro ao buscar curso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/courses/[id] - Atualizar curso
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const validatedData = updateCourseSchema.parse(body)

    // Verificar se curso existe
    const existingCourse = await prisma.course.findUnique({
      where: { id: params.id }
    })

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    // Se slug foi alterado, verificar se já existe
    if (validatedData.slug && validatedData.slug !== existingCourse.slug) {
      const slugExists = await prisma.course.findFirst({
        where: {
          slug: validatedData.slug,
          id: { not: params.id }
        }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug já existe' },
          { status: 400 }
        )
      }
    }

    // Se título foi alterado mas slug não, gerar novo slug
    if (validatedData.title && !validatedData.slug && validatedData.title !== existingCourse.title) {
      validatedData.slug = await generateUniqueSlug(validatedData.title, params.id)
    }

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true
          }
        }
      }
    })

    return NextResponse.json(updatedCourse)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar curso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/courses/[id] - Deletar curso
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Verificar se curso existe
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se há inscrições ativas
    if (course._count.enrollments > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar curso com inscrições ativas' },
        { status: 400 }
      )
    }

    // Deletar curso e seus módulos/lições em cascata
    await prisma.course.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Curso deletado com sucesso' })

  } catch (error) {
    console.error('Erro ao deletar curso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}