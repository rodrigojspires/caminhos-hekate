import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MyCourses } from '@/components/dashboard/courses/MyCourses'
import { CourseFilters } from '@/components/dashboard/courses/CourseFilters'
import { CourseProgress } from '@/components/dashboard/courses/CourseProgress'
import { CoursesClient } from '@/components/dashboard/courses/CoursesClient'
import { prisma } from '@hekate/database'

export const metadata: Metadata = {
  title: 'Meus Cursos | Minha Escola',
  description: 'Gerencie seus cursos e acompanhe seu progresso de aprendizado'
}

interface CourseData {
  id: string
  slug: string
  title: string
  description: string
  thumbnail: string
  instructor: string
  duration: string
  progress: number
  status: 'not_started' | 'in_progress' | 'completed'
  rating: number
  totalLessons: number
  completedLessons: number
  lastAccessed?: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  enrolledAt: string
  totalStudyTime: number
  estimatedTimeRemaining: number
}

interface CourseStats {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  notStartedCourses: number
  totalStudyTime: number
  averageProgress: number
}

async function getUserCourses(): Promise<{ courses: CourseData[], stats: CourseStats } | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return null
    }

    const userId = session.user.id

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

    const coursesWithProgress: CourseData[] = []

    for (const enrollment of enrollments) {
      const { course } = enrollment

      const totalLessons = course.modules.reduce(
        (total, module) => total + module.lessons.length,
        0
      )

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

      const completedLessons = progresses.filter(p => p.completed).length
      const progressPercentage = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0

      let status: 'not_started' | 'in_progress' | 'completed'
      if (completedLessons === 0) {
        status = 'not_started'
      } else if (completedLessons >= totalLessons) {
        status = 'completed'
      } else {
        status = 'in_progress'
      }

      const lastAccessedDate = progresses.length > 0
        ? progresses.reduce((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), null as Date | null)
        : null

      const totalStudyTimeMinutes = progresses.reduce(
        (total, p) => total + (p.videoTime || 0),
        0
      )

      const courseDurationMinutes = course.modules.reduce(
        (total, module) => total + module.lessons.reduce(
          (moduleTotal, lesson) => moduleTotal + (lesson.videoDuration || 0),
          0
        ),
        0
      )

      coursesWithProgress.push({
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description || '',
        thumbnail: course.featuredImage || '/images/course-placeholder.jpg',
        instructor: 'Instrutor',
        duration: course.duration ? `${Math.round(course.duration / 60)}h` : `${Math.round(courseDurationMinutes / 60)}h`,
        progress: progressPercentage,
        status,
        rating: 4.5,
        totalLessons,
        completedLessons,
        lastAccessed: lastAccessedDate?.toISOString(),
        category: course.category?.slug || course.category?.name || 'geral',
        level: (course.level?.toLowerCase() as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
        enrolledAt: enrollment.createdAt.toISOString(),
        totalStudyTime: Math.round(totalStudyTimeMinutes / 60),
        estimatedTimeRemaining: Math.max(0, Math.round((courseDurationMinutes - totalStudyTimeMinutes) / 60))
      })
    }

    const stats: CourseStats = {
      totalCourses: coursesWithProgress.length,
      completedCourses: coursesWithProgress.filter(c => c.status === 'completed').length,
      inProgressCourses: coursesWithProgress.filter(c => c.status === 'in_progress').length,
      notStartedCourses: coursesWithProgress.filter(c => c.status === 'not_started').length,
      totalStudyTime: coursesWithProgress.reduce((total, c) => total + c.totalStudyTime, 0),
      averageProgress: coursesWithProgress.length > 0
        ? Math.round(coursesWithProgress.reduce((total, c) => total + c.progress, 0) / coursesWithProgress.length)
        : 0
    }

    return { courses: coursesWithProgress, stats }
  } catch (error) {
    console.error('Erro ao buscar cursos do usuário:', error)
    return { courses: [], stats: { totalCourses: 0, completedCourses: 0, inProgressCourses: 0, notStartedCourses: 0, totalStudyTime: 0, averageProgress: 0 } }
  }
}

export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const data = await getUserCourses()
  
  if (!data) {
    redirect('/auth/login')
  }

  const { courses, stats } = data
  
  // Separar cursos por status
  const inProgressCourses = courses.filter(course => course.status === 'in_progress')
  const completedCourses = courses.filter(course => course.status === 'completed')
  const notStartedCourses = courses.filter(course => course.status === 'not_started')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Cursos</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e continue aprendendo
          </p>
        </div>
      </div>

      <div className="grid gap-6 items-start lg:grid-cols-4">
        <div className="lg:col-span-3 min-w-0">
          <CoursesClient 
            inProgressCourses={inProgressCourses}
            completedCourses={completedCourses}
            notStartedCourses={notStartedCourses}
          />
        </div>

        <div className="space-y-6 min-w-0 lg:col-span-1">
          <CourseProgress 
            totalCourses={stats.totalCourses}
            completedCourses={stats.completedCourses}
            inProgressCourses={stats.inProgressCourses}
            totalHours={Math.round(stats.totalStudyTime / 60)}
            completedHours={Math.round(stats.totalStudyTime / 60)}
            averageProgress={stats.averageProgress}
          />
        </div>
      </div>
    </div>
  )
}
