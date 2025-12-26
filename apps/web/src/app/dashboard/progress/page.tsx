'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ProgressCharts from '@/components/dashboard/progress/ProgressCharts'
import ProgressTimeline from '@/components/dashboard/progress/ProgressTimeline'
import ProgressGoals from '@/components/dashboard/progress/ProgressGoals'
import ProgressInsights from '@/components/dashboard/progress/ProgressInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Trophy } from 'lucide-react'
import { useGamificationStore } from '@/stores/gamificationStore'
import RecentActivity from '@/components/gamification/dashboard/RecentActivity'
import type { PointTransaction } from '@/types/gamification'

type ProgressData = {
  weeklyProgress: Array<{
    week: string
    lessons: number
    points?: number
    studyTime?: number
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
    lessons?: number
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
}

type TimelineEvent = {
  id: string
  type: 'milestone' | 'course_start' | 'course_complete' | 'certificate' | 'achievement'
  title: string
  description: string
  date: string
  status: 'completed' | 'current' | 'upcoming'
  metadata?: {
    courseName?: string
    points?: number
    certificateId?: string
    progress?: number
    orderNumber?: string
    reasonLabel?: string
  }
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

const emptyProgressData: ProgressData = {
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
    totalPoints: 0
  }
}

const getTransactionReasonLabel = (tx: PointTransaction) => {
  if (tx.description) return tx.description
  const normalized = tx.reason.replace(/_/g, ' ').toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export default function ProgressPage() {
  const {
    userPoints,
    achievements,
    recentTransactions,
    isLoadingPoints,
    isLoadingAchievements,
    fetchUserPoints,
    fetchAchievements
  } = useGamificationStore()

  const [progressData, setProgressData] = useState<ProgressData>(emptyProgressData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])

  const totalPoints = userPoints?.totalPoints ?? 0
  const currentLevel = userPoints?.currentLevel ?? 1

  const fetchProgressData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/user/progress', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Falha ao carregar progresso')
      }
      const data = await response.json()

      const categoryProgress = (data.courseProgress ?? []).map((course: any) => {
        const totalLessons = course.totalLessons || 0
        const completedLessons = course.completedLessons || 0
        return {
          category: course.courseTitle || 'Curso',
          completed: completedLessons,
          total: totalLessons,
          percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
        }
      })

      const weeklyProgress = (data.weeklyProgress ?? []).map((week: any) => ({
        week: week.week,
        lessons: week.lessons
      }))

      const monthlyTrends = (data.monthlyData ?? []).map((month: any) => ({
        month: month.month,
        hours: month.hours,
        lessons: month.lessons
      }))

      setProgressData({
        weeklyProgress,
        categoryProgress,
        dailyActivity: [],
        monthlyTrends,
        summary: {
          totalLessonsCompleted: data.overview?.totalLessonsCompleted ?? 0,
          completionRate: data.overview?.completionRate ?? 0,
          totalCourses: data.overview?.totalCourses ?? 0,
          completedCourses: data.overview?.completedCourses ?? 0,
          inProgressCourses: data.overview?.inProgressCourses ?? 0,
          totalPoints
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar progresso')
    } finally {
      setLoading(false)
    }
  }, [totalPoints])

  useEffect(() => {
    fetchProgressData()
  }, [fetchProgressData])

  useEffect(() => {
    fetchUserPoints()
    fetchAchievements()
  }, [fetchUserPoints, fetchAchievements])

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = []

    for (const achievement of achievements ?? []) {
      if (!achievement.unlockedAt) continue
      events.push({
        id: `achievement-${achievement.id}`,
        type: 'achievement',
        title: achievement.name,
        description: achievement.description || 'Conquista desbloqueada',
        date: achievement.unlockedAt,
        status: 'completed'
      })
    }

    for (const tx of recentTransactions ?? []) {
      events.push({
        id: `transaction-${tx.id}`,
        type: 'milestone',
        title: getTransactionReasonLabel(tx),
        description: tx.points >= 0 ? `+${tx.points} pontos` : `${tx.points} pontos`,
        date: tx.createdAt,
        status: 'completed',
        metadata: {
          points: tx.points,
          orderNumber: tx.metadata?.orderNumber,
          reasonLabel: getTransactionReasonLabel(tx)
        }
      })
    }

    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)
  }, [achievements, recentTransactions])

  const insights = useMemo<Insight[]>(() => {
    const items: Insight[] = []
    const now = new Date().toISOString()
    const summary = progressData.summary

    if (summary.totalLessonsCompleted > 0) {
      items.push({
        id: 'lessons-completed',
        type: 'milestone',
        title: 'Aulas concluídas',
        description: `Você concluiu ${summary.totalLessonsCompleted} aulas até agora.`,
        value: summary.totalLessonsCompleted,
        priority: 'medium',
        createdAt: now
      })
    }

    if (summary.completionRate > 0) {
      items.push({
        id: 'completion-rate',
        type: 'improvement',
        title: 'Taxa de conclusão',
        description: `Seu progresso geral é de ${summary.completionRate}%.`,
        value: summary.completionRate,
        priority: 'low',
        createdAt: now
      })
    }

    if (totalPoints > 0) {
      items.push({
        id: 'points-earned',
        type: 'achievement',
        title: 'Energia acumulada',
        description: `Você já acumulou ${totalPoints} pontos.`,
        value: totalPoints,
        priority: 'low',
        createdAt: now
      })
    }

    return items
  }, [progressData.summary, totalPoints])

  const handleCreateGoal = useCallback((goal: Omit<Goal, 'id' | 'current' | 'status' | 'createdAt'>) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
    setGoals((prev) => [
      {
        ...goal,
        id,
        current: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      },
      ...prev
    ])
  }, [])

  const handleUpdateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)))
  }, [])

  const handleDeleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trilha de Ascensão</h1>
        <p className="text-muted-foreground">
          Observe sua jornada evolutiva, seus marcos e as energias que você movimenta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Energia Acumulada
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
              Sigilos Conquistados
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
              <span>Nenhum sigilo desbloqueado.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trocas Recentes</CardTitle>
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
              <span className="text-xs">Nenhuma troca registrada.</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Panorama</TabsTrigger>
          <TabsTrigger value="timeline">Crônicas</TabsTrigger>
          <TabsTrigger value="goals">Profecias</TabsTrigger>
          <TabsTrigger value="insights">Revelações</TabsTrigger>
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
