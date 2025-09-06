import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/user/progress - Dados de progresso do usuário para o dashboard
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    // Cursos matriculados
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true }
    })
    const courseIds = enrollments.map(e => e.courseId)

    // Progresso por curso
    const courseProgress: Array<{
      courseId: string
      courseTitle: string
      completedLessons: number
      totalLessons: number
      progress: number
      lastAccessed: Date | null
    }> = []

    if (courseIds.length > 0) {
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true }
      })

      for (const course of courses) {
        const modules = await prisma.module.findMany({
          where: { courseId: course.id },
          select: { id: true }
        })
        const moduleIds = modules.map(m => m.id)
        const totalLessons = moduleIds.length
          ? await prisma.lesson.count({ where: { moduleId: { in: moduleIds } } })
          : 0

        const progresses = await prisma.progress.findMany({
          where: {
            userId,
            lesson: { module: { courseId: course.id } }
          },
          select: { completed: true, updatedAt: true }
        })

        const completedLessons = progresses.filter(p => p.completed).length
        const lastAccessed = progresses.reduce<Date | null>((max, p) => (!max || p.updatedAt > max ? p.updatedAt : max), null)
        const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        courseProgress.push({
          courseId: course.id,
          courseTitle: course.title,
          completedLessons,
          totalLessons,
          progress: progressPct,
          lastAccessed
        })
      }
    }

    // Totais gerais
    const [totalLessonsCompleted, totalLessonsAll, totalStudyTime] = await Promise.all([
      prisma.progress.count({ where: { userId, completed: true } }),
      prisma.lesson.count(),
      prisma.progress.aggregate({ where: { userId }, _sum: { videoTime: true } }).then(r => Number(r._sum.videoTime || 0))
    ])

    const completedCourses = courseProgress.filter(c => c.totalLessons > 0 && c.completedLessons >= c.totalLessons).length
    const overview = {
      totalCourses: courseProgress.length,
      completedCourses,
      inProgressCourses: courseProgress.length - completedCourses,
      totalLessonsCompleted,
      totalLessons: totalLessonsAll,
      completionRate: totalLessonsAll > 0 ? Math.round((totalLessonsCompleted / totalLessonsAll) * 100) : 0
    }

    // Weekly progress (últimas 8 semanas)
    const now = new Date()
    const startRange = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
    const weeklyRaw = await prisma.progress.findMany({
      where: { userId, completed: true, updatedAt: { gte: startRange } },
      select: { updatedAt: true }
    })
    const weekFormatter = new Intl.DateTimeFormat('pt-BR', { month: '2-digit', day: '2-digit' })
    const weeklyMap: Record<string, number> = {}
    for (const p of weeklyRaw) {
      const d = new Date(p.updatedAt)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const label = weekFormatter.format(weekStart)
      weeklyMap[label] = (weeklyMap[label] || 0) + 1
    }
    const weeklyProgress = Object.entries(weeklyMap).map(([week, lessons]) => ({ week, lessons }))

    // Monthly data (últimos 6 meses)
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 6)
    const monthlyRaw = await prisma.progress.findMany({
      where: { userId, updatedAt: { gte: sixMonthsAgo } },
      select: { updatedAt: true, videoTime: true }
    })
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    const monthlyMap: Record<string, { lessons: number; hours: number }> = {}
    for (const p of monthlyRaw) {
      const label = monthFormatter.format(new Date(p.updatedAt))
      if (!monthlyMap[label]) monthlyMap[label] = { lessons: 0, hours: 0 }
      monthlyMap[label].lessons += 1
      monthlyMap[label].hours += (Number(p.videoTime || 0) / 60)
    }
    const monthlyData = Object.entries(monthlyMap).map(([month, v]) => ({ month, lessons: v.lessons, hours: Math.round(v.hours) }))

    return NextResponse.json({
      overview,
      weeklyProgress,
      monthlyData,
      courseProgress
    })
  } catch (error) {
    console.error('Erro ao gerar progresso do usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

