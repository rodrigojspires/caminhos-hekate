'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Sparkles, 
  Flame
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  index: number
}

function StatCard({ title, value, description, icon: Icon, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="glass-dark border border-hekate-gold/20 h-full">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold text-hekate-pearl/90">{title}</CardTitle>
          <Icon className="h-5 w-5 text-hekate-gold" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif gradient-text-gold">{value}</div>
          <p className="text-xs text-hekate-pearl/60 mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DashboardStats() {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<null | {
    overview: {
      completedCourses: number
      inProgressCourses: number
    }
    monthlyData: Array<{ hours: number }>
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
        if (!cancelled) setProgress(null)
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
    return Number(last?.hours || 0).toFixed(1)
  }, [progress])

  const stats = [
    {
      title: 'Rituais Ativos',
      value: progress?.overview?.inProgressCourses ?? '-',
      description: 'Jornadas em progresso',
      icon: BookOpen,
    },
    {
      title: 'Horas em Rituais',
      value: `${monthHours}h`,
      description: 'Dedicadas este mês',
      icon: Clock,
    },
    {
      title: 'Selos Conquistados',
      value: progress?.overview?.completedCourses ?? '-',
      description: 'Conquistas totais',
      icon: Trophy,
    },
    {
      title: 'Progresso Médio',
      value: `${averageProgress}%`,
      description: 'Em todas as jornadas',
      icon: Sparkles,
    },
    {
      title: 'Chama do Conhecimento',
      value: `${streakDays} dias`,
      description: 'Dias de dedicação',
      icon: Flame,
    }
  ]

  return (
    <div className="my-8">
      <h2 className="text-xl font-semibold font-serif text-hekate-pearl mb-4 px-2">Seu Poder</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
