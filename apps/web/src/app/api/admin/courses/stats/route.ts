import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { z } from 'zod'
import { CourseStatus, CourseLevel } from '@hekate/database'



// GET /api/admin/courses/stats - Estatísticas de cursos
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Estatísticas gerais
    const [totalCourses, totalEnrollments] = await Promise.all([
      prisma.course.count(),
      prisma.enrollment.count()
    ])

    // Calcular receita total baseada nos preços dos cursos
    const enrollmentsWithCourse = await prisma.enrollment.findMany({
      where: {
        status: 'active' // só considerar inscrições ativas (pagas/liberadas)
      },
      include: {
        course: {
          select: {
            price: true
          }
        }
      }
    })
    
    const totalRevenueAmount = enrollmentsWithCourse.reduce((sum, enrollment) => {
      return sum + (enrollment.course.price ? Number(enrollment.course.price) : 0)
    }, 0)

    // Cursos por status
    const coursesByStatus = await prisma.course.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Cursos por nível
    const coursesByLevel = await prisma.course.groupBy({
      by: ['level'],
      _count: {
        id: true
      }
    })

    // Inscrições por período
    const enrollmentsByPeriod = await prisma.enrollment.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      }
    })

    // Top 10 cursos mais populares
    const topCourses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        enrollments: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Receita por curso
    const revenueByCourse = await prisma.enrollment.groupBy({
      by: ['courseId'],
      where: {
        status: 'active' // manter consistência com cálculo de receita
      },
      _count: {
        id: true
      }
    })

    // Buscar informações dos cursos para receita
    const courseIds = revenueByCourse.map(item => item.courseId)
    const coursesInfo = await prisma.course.findMany({
      where: {
        id: {
          in: courseIds
        }
      },
      select: {
        id: true,
        title: true
      }
    })

    // Combinar dados de receita com informações do curso
    const revenueWithCourseInfo = revenueByCourse.map(item => {
      const course = coursesInfo.find(c => c.id === item.courseId)
      const courseEnrollments = enrollmentsWithCourse.filter(e => e.courseId === item.courseId)
      const courseRevenue = courseEnrollments.reduce((sum, enrollment) => {
        return sum + (enrollment.course.price ? Number(enrollment.course.price) : 0)
      }, 0)
      
      return {
        courseId: item.courseId,
        courseName: course?.title || 'Curso não encontrado',
        totalRevenue: courseRevenue,
        totalEnrollments: item._count.id
      }
    }).sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))

    // Estatísticas de crescimento
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period))

    const [currentPeriodEnrollments, previousPeriodEnrollments] = await Promise.all([
      prisma.enrollment.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),
      prisma.enrollment.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      })
    ])

    const enrollmentGrowth = previousPeriodEnrollments > 0 
      ? ((currentPeriodEnrollments - previousPeriodEnrollments) / previousPeriodEnrollments) * 100
      : 0

    // Cursos recentes
    const recentCourses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    // Média de preços
    const averagePrice = await prisma.course.aggregate({
      _avg: {
        price: true
      },
      where: {
        status: CourseStatus.PUBLISHED
      }
    })

    return NextResponse.json({
      overview: {
        totalCourses,
        totalEnrollments,
        totalRevenue: totalRevenueAmount,
        averagePrice: averagePrice._avg.price || 0,
        enrollmentGrowth
      },
      coursesByStatus: coursesByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id
        return acc
      }, {} as Record<CourseStatus, number>),
      coursesByLevel: coursesByLevel.reduce((acc, item) => {
        if (item.level) {
          acc[item.level] = item._count.id
        }
        return acc
      }, {} as Record<CourseLevel, number>),
      topCourses,
      revenueByCourse: revenueWithCourseInfo.slice(0, 10),
      recentCourses,
      enrollmentsByPeriod: enrollmentsByPeriod.map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        enrollments: item._count.id,
        revenue: 0 // Será calculado separadamente se necessário
      })),
      period: parseInt(period)
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas de cursos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
