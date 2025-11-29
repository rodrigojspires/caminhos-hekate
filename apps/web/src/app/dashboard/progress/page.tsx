"use client"
import { useEffect, useMemo, useState } from 'react'
import { useCallback } from 'react'
import ProgressCharts from '@/components/dashboard/progress/ProgressCharts'
import ProgressTimeline from '@/components/dashboard/progress/ProgressTimeline'
import ProgressGoals from '@/components/dashboard/progress/ProgressGoals'
import ProgressInsights from '@/components/dashboard/progress/ProgressInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Trophy } from 'lucide-react'
import { useGamificationStore } from '@/stores/gamificationStore'
import RecentActivity from '@/components/gamification/dashboard/RecentActivity'
import type { PointTransaction } from '@/types/gamification'

interface ProgressData {
  weeklyProgress: Array<{
    week: string
    lessons: number
    points?: number
  }>
  categoryProgress: Array<{
    category: string
    completed: number
    total: number
    percentage: number
  }>
  dailyActivity: Array<{
    date: string
    minutes: number
    lessons: number
  }>
  monthlyTrends: Array<{
    month: string
    hours: number
    lessons: number
  }>
  summary: {
    totalLessonsCompleted: number
    completionRate: number
    totalCourses: number
    completedCourses: number
    inProgressCourses: number
    totalPoints: number
  }
  courseProgress: Array<{
    courseId: string
    courseTitle: string
    completedLessons: number
    totalLessons: number
    progress: number
    lastAccessed?: string | null
  }>
}

type Goal = {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  target: number
  current: number
  unit: string
  deadline: string
  status: 'active' | 'completed' | 'paused' | 'overdue'
  category: 'study_time' | 'courses' | 'certificates' | 'points' | 'streak'
  createdAt: string
}

type Insight = {
  id: string
  type: 'achievement' | 'improvement' | 'warning' | 'milestone' | 'streak' | 'recommendation'
  title: string
  description: string
  value?: string | number
  change?: number
  period?: string
  actionable?: boolean
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

const ORDER_EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Pedido criado',
  ORDER_PAID: 'Pagamento confirmado',
  ORDER_COMPLETED: 'Pedido concluído',
}

const isShoutingCase = (value: string) => /^[A-Z0-9_]+$/.test(value)

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const formatReasonLabel = (reason?: string) => {
  if (!reason) return 'Atividade registrada'
  if (ORDER_EVENT_LABELS[reason]) return ORDER_EVENT_LABELS[reason]
  return isShoutingCase(reason) ? toTitleCase(reason) : reason
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getTransactionReasonLabel = (transaction: PointTransaction) => {
  const metadataLabel =
    typeof transaction.metadata?.reasonLabel === 'string'
      ? transaction.metadata.reasonLabel.trim()
      : ''

  if (metadataLabel) return metadataLabel

  const metadataEventType =
    typeof transaction.metadata?.eventType === 'string'
      ? transaction.metadata.eventType
      : undefined

  if (metadataEventType && ORDER_EVENT_LABELS[metadataEventType]) {
    return ORDER_EVENT_LABELS[metadataEventType]
  }

  return formatReasonLabel(transaction.reason)
}

const buildTransactionDescription = (transaction: PointTransaction, reasonLabel: string) => {
  const { description, reason, points } = transaction

  if (!description) {
    return points >= 0 ? `Pontos ganhos: ${reasonLabel}` : reasonLabel
  }

  if (reason) {
    const replaced = description.replace(new RegExp(escapeRegex(reason), 'gi'), reasonLabel)
    if (replaced !== description) {
      return replaced
    }
  }

  if (/Pontos ganhos/i.test(description) && points >= 0) {
    return `Pontos ganhos: ${reasonLabel}`
  }

  if (/Pontos gastos/i.test(description) && points < 0) {
    return `Pontos gastos: ${reasonLabel}`
  }

  return description
}

export default function ProgressPage() {
  const {
    userPoints,
    recentTransactions,
    achievements,
    fetchUserPoints,
    fetchAchievements,
    isLoadingPoints,
    isLoadingAchievements,
  } = useGamificationStore()

  const [progressData, setProgressData] = useState<ProgressData>({
    weeklyProgress: [],
    categoryProgress: [],
    dailyActivity: [],
    monthlyTrends: [],
    summary: {
      totalLessonsCompleted: 0,
      completionRate: 0,
      totalCourses: 0,
      completedCourses: 0,
      inProgressCourses: 0,
      totalPoints: 0,
    },
    courseProgress: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [statsSnapshot, setStatsSnapshot] = useState<any | null>(null)
  const [leaderboardSnapshot, setLeaderboardSnapshot] = useState<number | null>(null)
  const [missions, setMissions] = useState<
    Array<{ id: string; title: string; description: string; target: number; current: number; unit: string; status: 'active' | 'completed'; type: 'lessons' | 'points' | 'days' }>
  >([])

  const fetchProgressData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsResult, userProgressResult] = await Promise.allSettled([
        fetch('/api/gamification/stats'),
        fetch('/api/user/progress'),
      ])

      const statsOk = statsResult.status === 'fulfilled' && statsResult.value.ok
      const progressOk = userProgressResult.status === 'fulfilled' && userProgressResult.value.ok

      if (!statsOk && !progressOk) {
        throw new Error('Não foi possível carregar os dados de progresso')
      }

      const statsData = statsOk ? await statsResult.value.json() : null
      const userProgressData = progressOk ? await userProgressResult.value.json() : null

      const weeklyProgress =
        userProgressData?.weeklyProgress?.map((week: any) => ({
          week: week.week,
          lessons: week.lessons,
        })) ||
        statsData?.weeklyActivity?.map((day: any, index: number) => ({
          week: `Semana ${index + 1}`,
          lessons: Math.floor((day.points || 0) / 10),
          points: day.points,
        })) ||
        []

      const dailyActivity =
        statsData?.weeklyActivity?.map((day: any) => ({
          date: day.date,
          minutes: day.points,
          lessons: Math.floor(day.points / 10),
        })) || []

      const categoryProgress =
        statsData?.categoryProgress?.map((cat: any) => ({
          category: cat.name,
          completed: cat.unlocked,
          total: cat.total,
          percentage: cat.progress,
        })) ||
        (userProgressData?.courseProgress || []).map((course: any) => ({
          category: course.courseTitle,
          completed: course.completedLessons,
          total: course.totalLessons,
          percentage: course.progress,
        }))

      const monthlyTrends =
        userProgressData?.monthlyData?.map((month: any) => ({
          month: month.month,
          hours: month.hours,
          lessons: month.lessons,
        })) ||
        []

      const convertedData: ProgressData = {
        weeklyProgress,
        categoryProgress,
        dailyActivity,
        monthlyTrends,
        summary: {
          totalLessonsCompleted: userProgressData?.overview?.totalLessonsCompleted || 0,
          completionRate: userProgressData?.overview?.completionRate || 0,
          totalCourses: userProgressData?.overview?.totalCourses || 0,
          completedCourses: userProgressData?.overview?.completedCourses || 0,
          inProgressCourses: userProgressData?.overview?.inProgressCourses || 0,
          totalPoints: statsData?.totalPoints || 0,
        },
        courseProgress: userProgressData?.courseProgress || [],
      }

      setProgressData(convertedData)
      if (statsData) setStatsSnapshot(statsData)
      setInsights(buildInsights(convertedData, statsData))
      updateGoalProgressWithData(convertedData, statsData)

      // Leaderboard snapshot diff
      if (typeof window !== 'undefined') {
        const storedRank = window.localStorage.getItem('hekate-leaderboard-rank')
        const prevRank = storedRank ? Number(storedRank) : null
        if (statsData?.leaderboardRank) {
          window.localStorage.setItem('hekate-leaderboard-rank', String(statsData.leaderboardRank))
          setLeaderboardSnapshot(prevRank)
        }
      }

      // Generate or load weekly missions
      hydrateMissions(convertedData, statsData)

      if (!statsOk || !progressOk) {
        setError('Alguns dados não foram carregados. Tente atualizar para ver tudo.')
      }
    } catch (error: any) {
      console.error('Error fetching progress data:', error)
      setError(error?.message || 'Erro ao carregar dados de progresso')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgressData()
  }, [fetchProgressData])

  useEffect(() => {
    fetchUserPoints()
    fetchAchievements()
  }, [fetchUserPoints, fetchAchievements])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedGoals = localStorage.getItem('hekate-progress-goals')
    if (storedGoals) {
      setGoals(JSON.parse(storedGoals))
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('hekate-progress-goals', JSON.stringify(goals))
  }, [goals])

  useEffect(() => {
    if (progressData && statsSnapshot) {
      updateGoalProgressWithData(progressData, statsSnapshot)
      setInsights(buildInsights(progressData, statsSnapshot))
      hydrateMissions(progressData, statsSnapshot)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressData, statsSnapshot])

  useEffect(() => {
    if (!loading && !error && goals.length === 0) {
      const starterGoals: Goal[] = [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          title: 'Completar 5 aulas na semana',
          description: 'Mantenha o ritmo de estudo semanal.',
          type: 'weekly',
          target: 5,
          current: 0,
          unit: 'aulas',
          deadline: '',
          status: 'active',
          category: 'courses',
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
          title: 'Ganhar 300 pontos',
          description: 'Acumule pontos participando das atividades.',
          type: 'monthly',
          target: 300,
          current: 0,
          unit: 'pontos',
          deadline: '',
          status: 'active',
          category: 'points',
          createdAt: new Date().toISOString(),
        },
      ]
      persistGoals(starterGoals)
      updateGoalProgressWithData(progressData, statsSnapshot)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error])

  const persistGoals = (nextGoals: Goal[]) => {
    setGoals(nextGoals)
    if (typeof window !== 'undefined') {
      localStorage.setItem('hekate-progress-goals', JSON.stringify(nextGoals))
    }
  }

  const metricsFromData = (data: ProgressData, stats?: any) => {
    const totalMinutes = data.dailyActivity.reduce((sum, day) => sum + (day.minutes || 0), 0)
    return {
      totalMinutes,
      totalLessonsCompleted: data.summary.totalLessonsCompleted,
      completedCourses: data.summary.completedCourses,
      points: stats?.totalPoints || 0,
      streak: stats?.activeStreaks || 0,
    }
  }

  const updateGoalProgressWithData = (data: ProgressData, stats?: any) => {
    const metrics = metricsFromData(data, stats)
    setGoals((prev) =>
      prev.map((goal) => {
        let current = goal.current
        if (goal.category === 'study_time') current = metrics.totalMinutes
        if (goal.category === 'courses') current = metrics.completedCourses
        if (goal.category === 'points') current = metrics.points
        if (goal.category === 'streak') current = metrics.streak

        const deadlineDate = goal.deadline ? new Date(goal.deadline) : null
        const isOverdue = deadlineDate ? deadlineDate.getTime() < Date.now() && current < goal.target : false
        const status = current >= goal.target ? 'completed' : isOverdue ? 'overdue' : goal.status
        return { ...goal, current, status }
      })
    )
  }

  const handleCreateGoal = (goal: Omit<Goal, 'id' | 'current' | 'status' | 'createdAt'>) => {
    const metrics = metricsFromData(progressData)
    let current = 0
    if (goal.category === 'study_time') current = metrics.totalMinutes
    if (goal.category === 'courses') current = metrics.completedCourses
    if (goal.category === 'points') current = metrics.points
    if (goal.category === 'streak') current = metrics.streak

    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      current,
      status: current >= goal.target ? 'completed' : 'active',
      createdAt: new Date().toISOString(),
    }
    const nextGoals = [...goals, newGoal]
    persistGoals(nextGoals)
  }

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    persistGoals(goals.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)))
  }

  const handleDeleteGoal = (id: string) => {
    persistGoals(goals.filter((goal) => goal.id !== id))
  }

  const buildInsights = (data: ProgressData, stats: any): Insight[] => {
    const insightsList: Insight[] = []
    const now = new Date().toISOString()
    const totalHours = data.monthlyTrends.reduce((sum, m) => sum + (m.hours || 0), 0)
    const totalLessons = data.summary.totalLessonsCompleted
    const totalCourses = data.summary.completedCourses

    if (data.weeklyProgress.length >= 2) {
      const last = data.weeklyProgress[data.weeklyProgress.length - 1]
      const prev = data.weeklyProgress[data.weeklyProgress.length - 2]
      const change = last.lessons - prev.lessons
      if (change > 0) {
        insightsList.push({
          id: 'weekly-improvement',
          type: 'improvement',
          title: 'Ritmo crescente',
          description: `Você concluiu ${change} aulas a mais na última semana.`,
          change: Math.round((change / Math.max(prev.lessons, 1)) * 100),
          priority: 'medium',
          createdAt: now,
        })
      } else if (change < 0) {
        insightsList.push({
          id: 'weekly-drop',
          type: 'warning',
          title: 'Queda no ritmo',
          description: 'Seu volume de aulas caiu em relação à semana anterior.',
          change: Math.round((change / Math.max(prev.lessons, 1)) * 100),
          priority: 'high',
          createdAt: now,
        })
      }
    }

    const nearFinishCourse = data.courseProgress.find((course) => course.progress >= 70 && course.progress < 100)
    if (nearFinishCourse) {
      insightsList.push({
        id: `course-${nearFinishCourse.courseId}`,
        type: 'recommendation',
        title: 'Finalize um curso',
        description: `${nearFinishCourse.courseTitle} está ${nearFinishCourse.progress}% concluído. Termine para liberar o certificado.`,
        priority: 'medium',
        createdAt: now,
      })
    }

    if (stats?.activeStreaks > 0) {
      insightsList.push({
        id: 'streak-active',
        type: 'streak',
        title: 'Sequência ativa',
        description: `Você mantém ${stats.activeStreaks} sequência(s) ativa(s). Não pare agora!`,
        priority: 'low',
        createdAt: now,
      })
    }

    if (data.summary.completionRate >= 50) {
      insightsList.push({
        id: 'halfway',
        type: 'milestone',
        title: 'Metade do caminho',
        description: 'Você já concluiu mais de 50% das aulas disponíveis.',
        priority: 'medium',
        createdAt: now,
      })
    }

    if (stats?.recentAchievements?.length) {
      const recent = stats.recentAchievements[0]
      insightsList.push({
        id: `achievement-${recent.id}`,
        type: 'achievement',
        title: `Conquista: ${recent.title}`,
        description: recent.description || 'Conquista desbloqueada recentemente.',
        priority: 'low',
        createdAt: now,
      })
    }

    // Leaderboard variation insight
    if (stats?.leaderboardRank && leaderboardSnapshot && leaderboardSnapshot !== stats.leaderboardRank) {
      const diff = leaderboardSnapshot - stats.leaderboardRank
      insightsList.push({
        id: 'leaderboard-variation',
        type: diff > 0 ? 'improvement' : 'warning',
        title: 'Variação na leaderboard',
        description: diff > 0 ? `Você subiu ${Math.abs(diff)} posições!` : `Você caiu ${Math.abs(diff)} posições.`,
        priority: diff > 0 ? 'medium' : 'high',
        change: diff,
        createdAt: now,
      })
    }

    // Hours studied milestones
    const hourMilestones = [1, 5, 10, 50]
    const nextHour = hourMilestones.find((h) => totalHours < h)
    if (nextHour) {
      insightsList.push({
        id: 'hours-next',
        type: 'recommendation',
        title: 'Próximo marco de horas',
        description: `Faltam ${(nextHour - totalHours).toFixed(1)}h para atingir ${nextHour}h de estudo.`,
        priority: 'low',
        createdAt: now,
      })
    }

    // Lessons milestone
    const lessonMilestones = [10, 25, 50, 100]
    const nextLessons = lessonMilestones.find((m) => totalLessons < m)
    if (nextLessons) {
      insightsList.push({
        id: 'lessons-next',
        type: 'recommendation',
        title: 'Próximo marco de aulas',
        description: `Faltam ${nextLessons - totalLessons} aulas para ${nextLessons}.`,
        priority: 'low',
        createdAt: now,
      })
    }

    // Courses milestone
    const courseMilestones = [1, 3, 5, 10]
    const nextCourse = courseMilestones.find((c) => totalCourses < c)
    if (nextCourse) {
      insightsList.push({
        id: 'courses-next',
        type: 'recommendation',
        title: 'Próximo marco de cursos',
        description: `Complete mais ${nextCourse - totalCourses} curso(s) para atingir ${nextCourse}.`,
        priority: 'medium',
        createdAt: now,
      })
    }

    // Streak reminder
    if (stats?.activeStreaks === 0) {
      insightsList.push({
        id: 'streak-reminder',
        type: 'streak',
        title: 'Inicie uma sequência',
        description: 'Registre uma atividade hoje para começar uma nova sequência.',
        priority: 'medium',
        createdAt: now,
      })
    }

    return insightsList
  }

  const hydrateMissions = (data: ProgressData, stats?: any) => {
    if (typeof window === 'undefined') return
    const weekKey = `missions-week-${new Date().getFullYear()}-${new Date().getWeek?.() || new Date().toDateString().slice(0, 7)}`
    const stored = localStorage.getItem(weekKey)
    if (stored) {
      setMissions(JSON.parse(stored))
      return
    }

    const totalLessons = data.summary.totalLessonsCompleted
    const totalPoints = stats?.totalPoints || 0

    const generated: typeof missions = [
      {
        id: 'mission-lessons-5',
        title: 'Conclua 5 aulas esta semana',
        description: 'Mantenha o ritmo de estudos.',
        target: 5,
        current: 0,
        unit: 'aulas',
        status: 'active',
        type: 'lessons',
      },
      {
        id: 'mission-points-200',
        title: 'Ganhe 200 pontos',
        description: 'Participe de atividades para acumular pontos.',
        target: 200,
        current: 0,
        unit: 'pontos',
        status: 'active',
        type: 'points',
      },
    ]

    const enriched = generated.map((mission) => {
      let current = mission.current
      if (mission.type === 'lessons') current = totalLessons % mission.target
      if (mission.type === 'points') current = totalPoints % mission.target
      const status = current >= mission.target ? 'completed' : 'active'
      return { ...mission, current, status }
    })

    setMissions(enriched)
    localStorage.setItem(weekKey, JSON.stringify(enriched))
  }

  const buildMilestoneEvents = (data: ProgressData, stats?: any) => {
    const events: any[] = []
    const totalHours = data.monthlyTrends.reduce((sum, m) => sum + (m.hours || 0), 0)
    const totalLessons = data.summary.totalLessonsCompleted
    const totalCourses = data.summary.completedCourses
    const now = new Date().toISOString()

    const addEvent = (id: string, title: string, description: string, type: any, metadata?: any) => {
      events.push({
        id,
        type,
        title,
        description,
        date: now,
        status: 'completed' as const,
        metadata,
      })
    }

    // Hours milestones
    const hourMilestones = [1, 5, 10, 50]
    hourMilestones.forEach((h) => {
      if (totalHours >= h) addEvent(`hours-${h}`, `Marco de ${h}h`, `Você acumulou ${h} horas de estudo.`, 'achievement')
    })

    // Lessons milestones
    const lessonMilestones = [10, 25, 50, 100]
    lessonMilestones.forEach((m) => {
      if (totalLessons >= m) addEvent(`lessons-${m}`, `${m} aulas concluídas`, `Você concluiu ${m} aulas.`, 'achievement')
    })

    // Courses milestones
    const courseMilestones = [1, 3, 5, 10]
    courseMilestones.forEach((c) => {
      if (totalCourses >= c) addEvent(`courses-${c}`, `${c} curso(s) concluído(s)`, `Você finalizou ${c} curso(s).`, 'achievement')
    })

    // Course near finish
    data.courseProgress
      .filter((course) => course.progress >= 80 && course.progress < 100)
      .forEach((course) => {
        addEvent(
          `course-near-${course.courseId}`,
          `Quase lá: ${course.courseTitle}`,
          `Você completou ${course.progress}% deste curso.`,
          'course_start',
          { progress: course.progress, courseName: course.courseTitle }
        )
      })

    // Streaks
    if (stats?.activeStreaks > 0) {
      addEvent('streak-active', 'Sequência ativa', `Você mantém ${stats.activeStreaks} sequência(s) ativa(s).`, 'streak')
    }
    if (stats?.longestStreak) {
      addEvent('streak-record', 'Recorde de sequência', `Seu recorde é de ${stats.longestStreak} dias.`, 'streak')
    }

    // Missions completed
    missions.filter((m) => m.status === 'completed').forEach((mission) => {
      addEvent(`mission-${mission.id}`, mission.title, 'Missão semanal concluída.', 'milestone')
    })

    // Leaderboard change
    if (stats?.leaderboardRank && leaderboardSnapshot && leaderboardSnapshot !== stats.leaderboardRank) {
      const diff = leaderboardSnapshot - stats.leaderboardRank
      addEvent(
        'leaderboard-change',
        'Atualização na leaderboard',
        diff > 0 ? `Você subiu ${Math.abs(diff)} posições.` : `Você caiu ${Math.abs(diff)} posições.`,
        'milestone'
      )
    }

    return events
  }

  const timelineEvents = useMemo(() => {
    const transactionEvents = (recentTransactions || []).map((tx: PointTransaction) => {
      const reasonLabel = getTransactionReasonLabel(tx)
      const description = buildTransactionDescription(tx, reasonLabel)

      return {
        id: tx.id,
        type: 'milestone' as const,
        title: tx.metadata?.orderNumber ? `Pedido ${tx.metadata.orderNumber}` : reasonLabel,
        description,
        date: tx.createdAt,
        status: 'completed' as const,
        metadata: {
          points: tx.points,
          orderNumber: tx.metadata?.orderNumber,
        },
      }
    })

    const achievementEvents = (achievements || [])
      .map((achievement: any) => {
        const unlockedAt = achievement.unlockedAt || achievement.earnedAt || achievement?.metadata?.unlockedAt
        const name = achievement.name || achievement.achievement?.name
        if (!unlockedAt || !name) return null
        return {
          id: `achievement-${achievement.id || achievement.achievementId || name}`,
          type: 'achievement' as const,
          title: name,
          description: achievement.description || achievement.achievement?.description || '',
          date: unlockedAt,
          status: 'completed' as const,
          metadata: {
            points: achievement.points || achievement.achievement?.points || 0,
          },
        }
      })
      .filter(Boolean) as any[]

    const courseEvents =
      progressData.courseProgress
        .map((course) => {
          const date = course.lastAccessed || new Date().toISOString()
          return {
            id: `course-${course.courseId}`,
            type: course.progress >= 100 ? 'course_complete' : 'course_start',
            title: course.courseTitle,
            description: `Progresso: ${course.progress}% (${course.completedLessons}/${course.totalLessons} aulas)`,
            date,
            status: course.progress >= 100 ? 'completed' : 'current',
            metadata: {
              progress: course.progress,
              courseName: course.courseTitle,
            },
          }
        })
        .filter(Boolean) || []

    const milestoneEvents = buildMilestoneEvents(progressData, statsSnapshot)

    return [...transactionEvents, ...achievementEvents, ...courseEvents, ...milestoneEvents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [recentTransactions, achievements, progressData.courseProgress, missions, statsSnapshot, leaderboardSnapshot])

  const totalPoints = userPoints?.totalPoints ?? 0
  const currentLevel = userPoints?.currentLevel ?? 1

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Progresso</h1>
        <p className="text-muted-foreground">
          Visualize seu desenvolvimento e conquistas ao longo do tempo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Pontos acumulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingPoints ? '…' : totalPoints.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Nível atual: {currentLevel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              Conquistas recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {achievements
              ?.filter((achievement: any) => Boolean(achievement.unlockedAt))
              .slice(0, 3)
              .map((achievement: any) => (
                <Badge key={achievement.id} variant="secondary">
                  {achievement.name}
                </Badge>
              ))}
            {(!achievements || achievements.filter((a: any) => a.unlockedAt).length === 0) && (
              <span>Ainda sem conquistas desbloqueadas.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pedidos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {recentTransactions?.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center">
                <span className="truncate mr-2">
                  {tx.metadata?.orderNumber ? `Pedido ${tx.metadata.orderNumber}` : getTransactionReasonLabel(tx)}
                </span>
                <Badge variant={tx.points >= 0 ? 'default' : 'destructive'} className="text-xs">
                  {tx.points >= 0 ? '+' : ''}{tx.points}
                </Badge>
              </div>
            ))}
            {(!recentTransactions || recentTransactions.length === 0) && (
              <span className="text-xs">Nenhuma transação registrada.</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgressCharts
            data={progressData}
            loading={loading}
            error={error}
            onRetry={fetchProgressData}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProgressTimeline
            events={timelineEvents}
            loading={isLoadingPoints || isLoadingAchievements}
          />
          <RecentActivity />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <ProgressGoals
            goals={goals}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <ProgressInsights insights={insights} loading={loading} />
          {error && (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">{error}</div>
                <Button variant="outline" size="sm" onClick={fetchProgressData}>
                  Recarregar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
