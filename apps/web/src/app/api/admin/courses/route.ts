import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'
import { CourseStatus, CourseLevel } from '@hekate/database'

// Schema de validação para criação de curso
const createCourseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  shortDescription: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
  featured: z.boolean().default(false),
  featuredImage: z.string().url().optional(),
  introVideo: z.string().url().optional(),
  duration: z.number().min(0).optional(),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  tags: z.array(z.string()).default([]),
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

// GET /api/admin/courses - Listar cursos
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') as CourseStatus | null
    const level = searchParams.get('level') as CourseLevel | null
    const featured = searchParams.get('featured')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.status = status
    }

    if (level) {
      where.level = level
    }

    if (featured !== null) {
      where.featured = featured === 'true'
    }

    // Buscar cursos
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              enrollments: true,
              modules: true
            }
          }
        }
      }),
      prisma.course.count({ where })
    ])

    return NextResponse.json({
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar cursos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/courses - Criar curso
export async function POST(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const validatedData = createCourseSchema.parse(body)

    // Gerar slug único se não fornecido
    if (!validatedData.slug) {
      validatedData.slug = await generateUniqueSlug(validatedData.title)
    } else {
      // Verificar se slug já existe
      const existingCourse = await prisma.course.findUnique({
        where: { slug: validatedData.slug }
      })

      if (existingCourse) {
        return NextResponse.json(
          { error: 'Slug já existe' },
          { status: 400 }
        )
      }
    }

    const course = await prisma.course.create({
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

    return NextResponse.json(course, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao criar curso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}