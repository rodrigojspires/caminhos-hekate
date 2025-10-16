import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma, CourseStatus, CourseLevel } from '@hekate/database'

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

// Converter dados para CSV
function convertToCSV(data: any[], headers: string[]) {
  const csvHeaders = headers.join(',')
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      // Escapar aspas e quebras de linha
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value || ''
    }).join(',')
  )
  
  return [csvHeaders, ...csvRows].join('\n')
}

// GET /api/admin/courses/export - Exportar dados de cursos
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const type = searchParams.get('type') || 'courses' // courses, enrollments, stats
    const status = searchParams.get('status') as CourseStatus | null
    const level = searchParams.get('level') as CourseLevel | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let data: any[] = []
    let headers: string[] = []
    let filename = ''

    if (type === 'courses') {
      // Exportar dados de cursos
      const where: any = {}
      
      if (status) where.status = status
      if (level) where.level = level
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      const courses = await prisma.course.findMany({
        where,
        include: {
          _count: {
            select: {
              enrollments: true,
              modules: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      data = courses.map(course => {
        const compareValue =
          'comparePrice' in course && course.comparePrice != null
            ? Number((course as unknown as { comparePrice: Prisma.Decimal }).comparePrice)
            : ''

        const tagsValue = Array.isArray(course.tags)
          ? (course.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string')
          : []

        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          description: course.description || '',
          shortDescription: course.shortDescription || '',
          price: course.price != null ? Number(course.price) : '',
          comparePrice: compareValue,
          status: course.status,
          level: course.level,
          featured: course.featured ? 'Sim' : 'Não',
          duration: course.duration || '',
          maxStudents: course.maxStudents || '',
          totalEnrollments: course._count.enrollments,
          totalModules: course._count.modules,
          tags: tagsValue.join(', '),
          createdAt: course.createdAt.toISOString().split('T')[0],
          updatedAt: course.updatedAt.toISOString().split('T')[0]
        }
      })

      headers = [
        'id', 'title', 'slug', 'description', 'shortDescription', 'price', 'comparePrice',
        'status', 'level', 'featured', 'duration', 'maxStudents', 'totalEnrollments',
        'totalModules', 'tags', 'createdAt', 'updatedAt'
      ]

      filename = `cursos_${new Date().toISOString().split('T')[0]}`

    } else if (type === 'enrollments') {
      // Exportar dados de inscrições
      const where: any = {}
      
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      const enrollments = await prisma.enrollment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          course: {
            select: {
              id: true,
              title: true,
              status: true,
              level: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      data = enrollments.map(enrollment => ({
        id: enrollment.id,
        userId: enrollment.userId,
        userName: enrollment.user.name || '',
        userEmail: enrollment.user.email,
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        courseStatus: enrollment.course.status,
        courseLevel: enrollment.course.level,
        enrolledAt: enrollment.createdAt.toISOString().split('T')[0]
      }))

      headers = [
        'id', 'userId', 'userName', 'userEmail', 'courseId', 'courseTitle',
        'courseStatus', 'courseLevel', 'price', 'enrolledAt'
      ]

      filename = `inscricoes_${new Date().toISOString().split('T')[0]}`

    } else if (type === 'stats') {
      // Exportar estatísticas resumidas
      const [totalCourses, totalEnrollments] = await Promise.all([
        prisma.course.count(),
        prisma.enrollment.count()
      ])

      const coursesByStatus = await prisma.course.groupBy({
        by: ['status'],
        _count: { id: true }
      })

      const coursesByLevel = await prisma.course.groupBy({
        by: ['level'],
        _count: { id: true }
      })

      data = [
        { metric: 'Total de Cursos', value: totalCourses },
        { metric: 'Total de Inscrições', value: totalEnrollments },
        ...coursesByStatus.map(item => ({
          metric: `Cursos ${item.status}`,
          value: item._count.id
        })),
        ...coursesByLevel.map(item => ({
          metric: `Cursos ${item.level}`,
          value: item._count.id
        }))
      ]

      headers = ['metric', 'value']
      filename = `estatisticas_cursos_${new Date().toISOString().split('T')[0]}`
    }

    if (format === 'json') {
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}.json"`,
          'Content-Type': 'application/json'
        }
      })
    } else {
      // CSV por padrão
      const csv = convertToCSV(data, headers)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Content-Type': 'text/csv; charset=utf-8'
        }
      })
    }

  } catch (error) {
    console.error('Erro ao exportar dados:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
