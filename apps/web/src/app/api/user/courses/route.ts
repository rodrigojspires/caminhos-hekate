import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/user/courses - Cursos matriculados do usuário com progresso
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    // Buscar matrículas ativas do usuário
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: 'active'
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            featuredImage: true,
            duration: true,
            level: true,
            slug: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            modules: {
              select: {
                id: true,
                lessons: {
                  select: {
                    id: true,
                    videoDuration: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Processar dados de cada curso
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const { course } = enrollment
        
        // Calcular total de lições
        const totalLessons = course.modules.reduce(
          (total, module) => total + module.lessons.length,
          0
        )

        // Buscar progresso do usuário nas lições deste curso
        const lessonIds = course.modules.flatMap(
          module => module.lessons.map(lesson => lesson.id)
        )

        const progresses = await prisma.progress.findMany({
          where: {
            userId,
            lessonId: { in: lessonIds }
          },
          select: {
            lessonId: true,
            completed: true,
            videoTime: true,
            updatedAt: true
          }
        })

        // Calcular estatísticas de progresso
        const completedLessons = progresses.filter(p => p.completed).length
        const progressPercentage = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0

        // Determinar status do curso
        let status: 'not_started' | 'in_progress' | 'completed'
        if (completedLessons === 0) {
          status = 'not_started'
        } else if (completedLessons >= totalLessons) {
          status = 'completed'
        } else {
          status = 'in_progress'
        }

        // Última data de acesso
        const lastAccessed = progresses.length > 0
          ? progresses.reduce((latest, p) => 
              !latest || p.updatedAt > latest ? p.updatedAt : latest, 
              null as Date | null
            )
          : null

        // Tempo total de estudo (em minutos)
        const totalStudyTime = progresses.reduce(
          (total, p) => total + (p.videoTime || 0),
          0
        )

        // Duração total do curso (em minutos)
        const courseDuration = course.modules.reduce(
          (total, module) => total + module.lessons.reduce(
            (moduleTotal, lesson) => moduleTotal + (lesson.videoDuration || 0),
            0
          ),
          0
        )

        return {
          id: course.id,
          title: course.title,
          description: course.description || '',
          thumbnail: course.featuredImage || '/images/course-placeholder.jpg',
          instructor: 'Instrutor', // Campo fixo por enquanto
          duration: course.duration ? `${Math.round(course.duration / 60)}h` : `${Math.round(courseDuration / 60)}h`,
          progress: progressPercentage,
          status,
          rating: 4.5, // Rating fixo por enquanto
          totalLessons,
          completedLessons,
          lastAccessed: lastAccessed?.toISOString(),
          category: course.category?.slug || course.category?.name || 'geral',
          level: (course.level?.toLowerCase() as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
          enrolledAt: enrollment.createdAt.toISOString(),
          totalStudyTime: Math.round(totalStudyTime / 60), // em minutos
          estimatedTimeRemaining: Math.max(0, Math.round((courseDuration - totalStudyTime) / 60))
        }
      })
    )

    // Estatísticas gerais
    const stats = {
      totalCourses: coursesWithProgress.length,
      completedCourses: coursesWithProgress.filter(c => c.status === 'completed').length,
      inProgressCourses: coursesWithProgress.filter(c => c.status === 'in_progress').length,
      notStartedCourses: coursesWithProgress.filter(c => c.status === 'not_started').length,
      totalStudyTime: coursesWithProgress.reduce((total, c) => total + c.totalStudyTime, 0),
      averageProgress: coursesWithProgress.length > 0
        ? Math.round(coursesWithProgress.reduce((total, c) => total + c.progress, 0) / coursesWithProgress.length)
        : 0
    }

    return NextResponse.json({
      courses: coursesWithProgress,
      stats
    })
  } catch (error) {
    console.error('Erro ao buscar cursos do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}