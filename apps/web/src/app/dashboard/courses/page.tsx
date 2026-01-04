import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MyCourses } from '@/components/dashboard/courses/MyCourses'
import { CourseFilters } from '@/components/dashboard/courses/CourseFilters'
import { CourseProgress } from '@/components/dashboard/courses/CourseProgress'
import { CoursesClient } from '@/components/dashboard/courses/CoursesClient'
import { prisma } from '@hekate/database'
import { cookies } from 'next/headers'
import { DASHBOARD_VOCAB_COOKIE, getDashboardVocabulary, resolveDashboardVocabularyMode } from '@/lib/dashboardVocabulary'

export const metadata: Metadata = {
  title: 'Meus Rituais | Grimório',
  description: 'Acesse seus rituais de conhecimento e acompanhe sua ascensão.'
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
  enrollmentStatus: 'active' | 'pending'
  hasFreeLessons: boolean
  checkoutUrl: string
  certificateStatus: 'locked' | 'ready' | 'available'
  certificateUrl?: string
  certificateIssuedAt?: string
  certificateTemplateName?: string
}

interface CourseStats {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  notStartedCourses: number
  totalStudyTime: number
  averageProgress: number
  weeklyProgress: number[]
  streakDays: number
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
        status: { in: ['active', 'pending'] }
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
                    videoDuration: true,
                    isFree: true
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

    const certificates = await prisma.certificate.findMany({
      where: { userId },
      include: {
        template: {
          select: {
            name: true
          }
        }
      }
    })
    const certificatesByCourse = new Map(certificates.map((certificate) => [certificate.courseId, certificate]))

    const coursesWithProgress: CourseData[] = []
    const weeklyActivity = new Array(7).fill(0) as number[]
    const activityDates = new Set<string>()

    for (const enrollment of enrollments) {
      const { course } = enrollment

      const totalLessons = course.modules.reduce(
        (total, module) => total + module.lessons.length,
        0
      )

      const hasFreeLessons = course.modules.some((m) =>
        m.lessons.some((l) => l.isFree)
      )

      // Mostrar pendentes apenas se houver aulas gratuitas
      if (enrollment.status === 'pending' && !hasFreeLessons) {
        continue
      }

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

      const totalStudyTimeMinutes = progresses.reduce((total, p) => {
        const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === p.lessonId)
        const duration = lesson?.videoDuration || 0
        const credit = p.completed && duration > 0 ? duration : p.videoTime || 0
        return total + credit
      }, 0)

      const courseDurationMinutes = course.modules.reduce(
        (total, module) => total + module.lessons.reduce(
          (moduleTotal, lesson) => moduleTotal + (lesson.videoDuration || 0),
          0
        ),
        0
      )

      // Weekly activity and streaks (based on progress updates)
      const now = new Date()
      progresses.forEach((p) => {
        if (!p.updatedAt) return
        const dayDiff = Math.floor((now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
        if (dayDiff >= 0 && dayDiff < 7) {
          weeklyActivity[6 - dayDiff] += 1
        }
        const dayKey = p.updatedAt.toISOString().slice(0, 10)
        activityDates.add(dayKey)
      })

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
        estimatedTimeRemaining: Math.max(0, Math.round((courseDurationMinutes - totalStudyTimeMinutes) / 60)),
        enrollmentStatus: (enrollment.status as 'active' | 'pending') || 'active',
        hasFreeLessons,
        checkoutUrl: `/checkout?enrollCourseId=${course.id}`,
        certificateStatus: status === 'completed'
          ? (certificatesByCourse.has(course.id) ? 'available' : 'ready')
          : 'locked',
        certificateUrl: status === 'completed'
          ? `/api/certificates/${certificatesByCourse.get(course.id)?.id ?? course.id}`
          : undefined,
        certificateIssuedAt: certificatesByCourse.get(course.id)?.issuedAt?.toISOString(),
        certificateTemplateName: certificatesByCourse.get(course.id)?.template?.name
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
        : 0,
      weeklyProgress: weeklyActivity,
      streakDays: calculateStreak(Array.from(activityDates))
    }

    return { courses: coursesWithProgress, stats }
  } catch (error) {
    console.error('Erro ao buscar rituais do usuário:', error)
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
  const mode = resolveDashboardVocabularyMode(cookies().get(DASHBOARD_VOCAB_COOKIE)?.value)
  const labels = getDashboardVocabulary(mode)
  
  // Separar cursos por status
  const inProgressCourses = courses.filter(course => course.status === 'in_progress')
  const completedCourses = courses.filter(course => course.status === 'completed')
  const notStartedCourses = courses.filter(course => course.status === 'not_started')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold temple-heading">{labels.pages.coursesTitle}</h1>
          <p className="text-[hsl(var(--temple-text-secondary))]">
            {labels.pages.coursesSubtitle}
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
            notStartedCourses={stats.notStartedCourses}
            totalHours={Math.round(stats.totalStudyTime / 60)}
            completedHours={Math.round(stats.totalStudyTime / 60)}
            averageProgress={stats.averageProgress}
            weeklyProgress={stats.weeklyProgress}
            streakDays={stats.streakDays}
          />
        </div>
      </div>
    </div>
  )
}
function calculateStreak(dateStrings: string[]): number {
  if (!dateStrings.length) return 0
  const dates = dateStrings
    .map((d) => new Date(d + 'T00:00:00Z').getTime())
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a)

  let streak = 0
  let current = new Date()
  current.setUTCHours(0, 0, 0, 0)

  for (const ts of dates) {
    if (ts === current.getTime()) {
      streak += 1
      current = new Date(current.getTime() - 24 * 60 * 60 * 1000)
    } else if (ts === current.getTime() - 24 * 60 * 60 * 1000) {
      streak += 1
      current = new Date(current.getTime() - 24 * 60 * 60 * 1000)
    } else if (ts < current.getTime() - 24 * 60 * 60 * 1000) {
      break
    }
  }

  return streak
}
