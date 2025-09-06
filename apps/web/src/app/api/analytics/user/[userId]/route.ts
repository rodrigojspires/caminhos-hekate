import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/analytics/user/[userId]
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    // Permitir apenas o próprio usuário ou admins/editores
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const isSelf = session.user.id === userId
    const isAdminOrEditor = (session as any).user?.role === 'ADMIN' || (session as any).user?.role === 'EDITOR'
    if (!isSelf && !isAdminOrEditor) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Cursos matriculados
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true }
    })
    const courseIds = enrollments.map((e) => e.courseId)

    // Progresso por curso
    const coursesProgress = [] as Array<{
      courseId: string
      title: string
      progress: number
      timeSpent: number
      lastAccessed: Date | null
      completedLessons: number
      totalLessons: number
    }>

    if (courseIds.length > 0) {
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true }
      })

      for (const course of courses) {
        // Total de lições por curso
        const modules = await prisma.module.findMany({
          where: { courseId: course.id },
          select: { id: true }
        })
        const moduleIds = modules.map((m) => m.id)
        const totalLessons = moduleIds.length
          ? await prisma.lesson.count({ where: { moduleId: { in: moduleIds } } })
          : 0

        // Progressos do usuário neste curso
        const progresses = await prisma.progress.findMany({
          where: {
            userId,
            lesson: { module: { courseId: course.id } }
          },
          select: { completed: true, videoTime: true, updatedAt: true }
        })

        const completedLessons = progresses.filter((p) => p.completed).length
        const timeSpent = progresses.reduce((sum, p) => sum + (p.videoTime || 0), 0)
        const lastAccessed = progresses.reduce<Date | null>((max, p) => {
          return !max || p.updatedAt > max ? p.updatedAt : max
        }, null)

        const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        coursesProgress.push({
          courseId: course.id,
          title: course.title,
          progress: progressPct,
          timeSpent,
          lastAccessed,
          completedLessons,
          totalLessons
        })
      }
    }

    // Totais gerais
    const [totalStudyTime, completedLessons, certificatesEarned] = await Promise.all([
      prisma.progress.aggregate({
        where: { userId },
        _sum: { videoTime: true }
      }).then((r) => Number(r._sum.videoTime || 0)),
      prisma.progress.count({ where: { userId, completed: true } }),
      prisma.certificate.count({ where: { userId } })
    ])

    // Scores de quizzes recentes
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, quizId: true, score: true, createdAt: true }
    })
    const quizScores = quizAttempts.map((qa) => ({ id: qa.id, quizId: qa.quizId, score: qa.score, createdAt: qa.createdAt }))

    // Timeline de atividades (analytics events se houver)
    const events = await prisma.analyticsEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { id: true, name: true, category: true, action: true, timestamp: true }
    })
    const activityTimeline = events.map((ev) => ({
      id: ev.id,
      type: ev.category || 'event',
      title: ev.name,
      action: ev.action,
      date: ev.timestamp
    }))

    // Streak atual
    const userStreak = await prisma.userStreak.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } })
    const learningStreak = userStreak?.currentStreak || 0

    const payload = {
      userId,
      coursesProgress,
      totalStudyTime,
      completedLessons,
      certificatesEarned,
      quizScores,
      activityTimeline,
      learningStreak
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao gerar analytics do usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

