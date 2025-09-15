import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MyCourses } from '@/components/dashboard/courses/MyCourses'
import { CourseFilters } from '@/components/dashboard/courses/CourseFilters'
import { CourseProgress } from '@/components/dashboard/courses/CourseProgress'
import { CoursesClient } from '@/components/dashboard/courses/CoursesClient'

export const metadata: Metadata = {
  title: 'Meus Cursos | Minha Escola',
  description: 'Gerencie seus cursos e acompanhe seu progresso de aprendizado'
}

interface CourseData {
  id: string
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

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/user/courses`, {
      headers: {
        'Cookie': `next-auth.session-token=${session.user.id}` // Simplified for server-side
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('Erro ao buscar cursos:', response.status)
      return { courses: [], stats: { totalCourses: 0, completedCourses: 0, inProgressCourses: 0, notStartedCourses: 0, totalStudyTime: 0, averageProgress: 0 } }
    }

    return await response.json()
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
