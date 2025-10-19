import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'
import { CourseStatus, CourseLevel, SubscriptionTier } from '@hekate/database'
import { ensureCourseProduct } from '@/lib/shop/ensure-course-product'

// Schema de validação para criação de curso
const urlOrPathSchema = z
  .string()
  .trim()
  .min(1, 'URL é obrigatória')
  .refine((value) => {
    if (!value) return true
    if (value.startsWith('/')) return true
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }, 'URL inválida')

const createCourseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  shortDescription: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
  comparePrice: z.number().min(0, 'Preço de comparação deve ser maior ou igual a 0').nullable().optional(),
  accessModels: z.array(z.enum(['FREE', 'ONE_TIME', 'SUBSCRIPTION'])).min(1, 'Selecione pelo menos um modelo de acesso').default(['ONE_TIME']),
  tier: z.nativeEnum(SubscriptionTier).default(SubscriptionTier.FREE),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
  featured: z.boolean().default(false),
  categoryId: z.string().trim().min(1).optional().nullable(),
  featuredImage: urlOrPathSchema.nullable().optional(),
  introVideo: urlOrPathSchema.nullable().optional(),
  duration: z.number().min(0).optional(),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  maxStudents: z.number().min(1).optional()
}).superRefine((data, ctx) => {
  if (data.comparePrice != null && data.comparePrice <= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['comparePrice'],
      message: 'Preço de comparação deve ser maior que o preço atual'
    })
  }

  const hasSubscription = data.accessModels.includes('SUBSCRIPTION')

  if (hasSubscription && data.tier === SubscriptionTier.FREE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tier'],
      message: 'Selecione qual plano de assinatura inclui este curso'
    })
  }

  if (!hasSubscription && data.tier !== SubscriptionTier.FREE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tier'],
      message: 'Cursos fora da assinatura devem permanecer no plano FREE'
    })
  }
})



const normalizeTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string')
  }

  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags)
      return Array.isArray(parsed)
        ? parsed.filter((tag): tag is string => typeof tag === 'string')
        : []
    } catch {
      return []
    }
  }

  return []
}

const serializeCourse = <T extends { price?: any; comparePrice?: any; tags?: any }>(course: T) => {
  return {
    ...course,
    price: course.price != null ? Number(course.price) : null,
    comparePrice: course.comparePrice != null ? Number(course.comparePrice) : null,
    tags: normalizeTags(course.tags ?? []),
    category: (course as any).category ?? null,
    categoryId: (course as any).categoryId ?? null
  }
}

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
    const categoryId = searchParams.get('categoryId')
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

    if (categoryId) {
      where.categoryId = categoryId
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
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
        }
      }),
      prisma.course.count({ where })
    ])

    const normalizedCourses = courses.map((course) => serializeCourse(course))

    return NextResponse.json({
      courses: normalizedCourses,
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

    const titleStr = typeof validatedData.title === 'string' ? validatedData.title : String(validatedData.title)

    let finalSlug: string
    if (!validatedData.slug) {
      finalSlug = await generateUniqueSlug(titleStr)
    } else {
      const providedSlug = typeof validatedData.slug === 'string' ? validatedData.slug : String(validatedData.slug)
      // Verificar se slug já existe
      const existingCourse = await prisma.course.findUnique({
        where: { slug: providedSlug }
      })
      if (existingCourse) {
        return NextResponse.json(
          { error: 'Slug já existe' },
          { status: 400 }
        )
      }
      finalSlug = providedSlug
    }

    const { accessModels, tier, slug: _slug, categoryId, ...courseData } = validatedData
    const normalizedAccessModels = Array.from(new Set(accessModels)) as Prisma.CourseAccessModel[]
    const normalizedTier = normalizedAccessModels.includes('SUBSCRIPTION')
      ? tier
      : SubscriptionTier.FREE

    const createData: Prisma.CourseCreateInput = {
      ...courseData,
      slug: finalSlug,
      tier: normalizedTier,
      accessModels: normalizedAccessModels,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {})
    }

    const course = await prisma.course.create({
      data: createData,
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
      }
    })

    try {
      await ensureCourseProduct({
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription,
        featuredImage: course.featuredImage || undefined,
        price: course.price != null ? Number(course.price) : null,
        comparePrice: course.comparePrice != null ? Number(course.comparePrice) : null
      })
    } catch (productError) {
      console.error('Erro ao sincronizar produto do curso após criação:', productError)
    }

    return NextResponse.json(serializeCourse(course), { status: 201 })

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
