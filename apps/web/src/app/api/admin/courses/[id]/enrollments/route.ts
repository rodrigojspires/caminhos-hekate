import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para criar inscrição
const createEnrollmentSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  price: z.number().min(0).optional()
})

// Verificar se usuário é admin
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return { error: 'Não autorizado', status: 401 }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  })

  if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
    return { error: 'Permissão negada', status: 403 }
  }

  return { user }
}

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/courses/[id]/enrollments - Listar inscrições do curso
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Verificar se curso existe
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, title: true }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    // Construir filtros
    const where: any = {
      courseId: params.id
    }
    
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    // Buscar inscrições
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.enrollment.count({ where })
    ])

    return NextResponse.json({
      enrollments,
      course,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar inscrições:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/courses/[id]/enrollments - Criar inscrição manual
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const validatedData = createEnrollmentSchema.parse(body)

    // Verificar se curso existe
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        title: true, 
        price: true,
        maxStudents: true,
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

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já está inscrito
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: validatedData.userId,
          courseId: params.id
        }
      }
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Usuário já está inscrito neste curso' },
        { status: 400 }
      )
    }

    // Verificar limite de estudantes
    if (course.maxStudents && course._count.enrollments >= course.maxStudents) {
      return NextResponse.json(
        { error: 'Curso atingiu o limite máximo de estudantes' },
        { status: 400 }
      )
    }

    // Criar inscrição
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: validatedData.userId,
        courseId: params.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    return NextResponse.json(enrollment, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao criar inscrição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}