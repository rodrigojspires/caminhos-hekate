"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp,
  Users,
  Target,
  Calendar,
  Award
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  badge?: string
  index: number
}

function StatCard({ title, value, description, icon: Icon, trend, badge, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{description}</p>
            {trend && (
              <div className={`flex items-center text-xs ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  trend.isPositive ? '' : 'rotate-180'
                }`} />
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DashboardStats() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<null | {
    overview: {
      totalCourses: number
      completedCourses: number
      inProgressCourses: number
      totalLessonsCompleted: number
      totalLessons: number
      completionRate: number
    }
    monthlyData: Array<{ month: string; lessons: number; hours: number }>
    courseProgress: Array<{ progress: number }>
  }>(null)
  const [streakDays, setStreakDays] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [pRes, sRes] = await Promise.all([
          fetch('/api/user/progress'),
          fetch('/api/gamification/streaks?active=true')
        ])
        if (!pRes.ok) throw new Error('Falha ao carregar progresso')
        const pJson = await pRes.json()
        const sJson = sRes.ok ? await sRes.json() : []
        if (cancelled) return
        setProgress({
          overview: pJson.overview,
          monthlyData: pJson.monthlyData || [],
          courseProgress: pJson.courseProgress || []
        })
        const current = Array.isArray(sJson) ? Math.max(0, ...sJson.map((x: any) => Number(x.currentStreak || 0))) : 0
        setStreakDays(Number.isFinite(current) ? current : 0)
      } catch (_e) {
        if (!cancelled) {
          setProgress(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const averageProgress = useMemo(() => {
    if (!progress?.courseProgress?.length) return 0
    const sum = progress.courseProgress.reduce((acc, c) => acc + (Number(c.progress) || 0), 0)
    return Math.round(sum / progress.courseProgress.length)
  }, [progress])

  const monthHours = useMemo(() => {
    if (!progress?.monthlyData?.length) return 0
    const last = progress.monthlyData[progress.monthlyData.length - 1]
    return Number(last?.hours || 0)
  }, [progress])

  const stats = [
    {
      title: 'Cursos Ativos',
      value: progress?.overview?.inProgressCourses ?? 0,
      description: 'Em andamento',
      icon: BookOpen,
      trend: progress ? { value: 0, isPositive: true } : undefined,
      badge: undefined
    },
    {
      title: 'Horas de Estudo',
      value: `${monthHours}h`,
      description: 'Este mês',
      icon: Clock,
      trend: undefined
    },
    {
      title: 'Cursos Concluídos',
      value: progress?.overview?.completedCourses ?? 0,
      description: 'Total',
      icon: Trophy,
      badge: undefined
    },
    {
      title: 'Progresso Médio',
      value: `${averageProgress}%`,
      description: 'Todos os cursos',
      icon: Target,
      trend: undefined
    },
    {
      title: 'Sequência',
      value: `${streakDays} dias`,
      description: 'Estudo contínuo',
      icon: Calendar,
      trend: undefined,
      badge: 'Streak'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Estatísticas</h2>
        <Badge variant="outline">Atualizado agora</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
