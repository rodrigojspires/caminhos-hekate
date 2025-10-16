"use client"
import { useEffect, useMemo, useState } from 'react'
import ProgressCharts from '@/components/dashboard/progress/ProgressCharts'
import ProgressTimeline from '@/components/dashboard/progress/ProgressTimeline'
import ProgressGoals from '@/components/dashboard/progress/ProgressGoals'
import ProgressInsights from '@/components/dashboard/progress/ProgressInsights'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Trophy } from 'lucide-react'
import { useGamificationStore } from '@/stores/gamificationStore'
import RecentActivity from '@/components/gamification/dashboard/RecentActivity'
import type { PointTransaction } from '@/types/gamification'

interface ProgressData {
  weeklyProgress: {
    week: string
    studyTime: number
    lessonsCompleted: number
    points: number
  }[]
  categoryProgress: {
    category: string
    completed: number
    total: number
    percentage: number
  }[]
  dailyActivity: {
    date: string
    minutes: number
    lessons: number
  }[]
  monthlyGoals: {
    month: string
    target: number
    achieved: number
  }[]
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
    monthlyGoals: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProgressData = async () => {
      setLoading(true)
      try {
        const statsResponse = await fetch('/api/gamification/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()

          const convertedData: ProgressData = {
            weeklyProgress:
              statsData.weeklyActivity?.map((day: any, index: number) => ({
                week: `Semana ${Math.floor(index / 7) + 1}`,
                studyTime: day.points * 2,
                lessonsCompleted: Math.floor(day.points / 10),
                points: day.points,
              })) || [],
            categoryProgress:
              statsData.categoryProgress?.map((cat: any) => ({
                category: cat.name,
                completed: cat.unlocked,
                total: cat.total,
                percentage: cat.progress,
              })) || [],
            dailyActivity:
              statsData.weeklyActivity?.map((day: any) => ({
                date: day.date,
                minutes: day.points * 2,
                lessons: Math.floor(day.points / 10),
              })) || [],
            monthlyGoals: [
              {
                month: 'Janeiro',
                target: 1000,
                achieved: statsData.totalPoints || 0,
              },
            ],
          }

          setProgressData(convertedData)
        }
      } catch (error) {
        console.error('Error fetching progress data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgressData()
  }, [])

  useEffect(() => {
    fetchUserPoints()
    fetchAchievements()
  }, [fetchUserPoints, fetchAchievements])

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

    return [...transactionEvents, ...achievementEvents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [recentTransactions, achievements])

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
          <ProgressCharts data={progressData} loading={loading} />
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
            goals={[]}
            onCreateGoal={() => {}}
            onUpdateGoal={() => {}}
            onDeleteGoal={() => {}}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <ProgressInsights insights={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
