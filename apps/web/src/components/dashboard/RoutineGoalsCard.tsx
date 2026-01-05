'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleDashed, Flame, Hourglass } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface ProgressSnapshot {
  monthlyData: Array<{ hours: number }>
}

interface StreakItem {
  currentStreak?: number
}

const habits = [
  {
    title: 'Respirar antes do estudo',
    detail: '2 minutos de centramento',
  },
  {
    title: 'Registro no grimório',
    detail: 'Escrever uma intuição do dia',
  },
  {
    title: 'Prática guiada',
    detail: 'Uma meditação curta',
  }
]

export function RoutineGoalsCard() {
  const { apply } = useDashboardVocabulary()
  const [loading, setLoading] = useState(true)
  const [monthHours, setMonthHours] = useState(0)
  const [streakDays, setStreakDays] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [pRes, sRes] = await Promise.all([
          fetch('/api/user/progress'),
          fetch('/api/gamification/streaks?active=true')
        ])
        const pJson: ProgressSnapshot = pRes.ok ? await pRes.json() : { monthlyData: [] }
        const sJson: StreakItem[] = sRes.ok ? await sRes.json() : []

        if (cancelled) return

        const last = pJson.monthlyData?.length
          ? pJson.monthlyData[pJson.monthlyData.length - 1]
          : { hours: 0 }
        setMonthHours(Number(last?.hours || 0))

        const current = Array.isArray(sJson)
          ? Math.max(0, ...sJson.map((x) => Number(x.currentStreak || 0)))
          : 0
        setStreakDays(Number.isFinite(current) ? current : 0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const formattedHours = useMemo(() => {
    if (!Number.isFinite(monthHours)) return '0'
    return Number(monthHours).toFixed(1)
  }, [monthHours])

  if (loading) {
    return (
      <Card className="temple-card">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="font-serif text-[hsl(var(--temple-text-primary))]">
          {apply('Rotina e Metas')}
        </CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {apply('Três hábitos para manter a chama acesa.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.title}
              className="flex items-center justify-between rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[hsl(var(--temple-surface-3))] flex items-center justify-center">
                  <CircleDashed className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--temple-text-primary))]">{apply(habit.title)}</p>
                  <p className="text-xs text-[hsl(var(--temple-text-secondary))]">{apply(habit.detail)}</p>
                </div>
              </div>
              <Badge variant="secondary" className="temple-chip text-xs">
                {apply('Em aberto')}
              </Badge>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
              <Flame className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
              {apply('Chama atual')}
            </div>
            <p className="text-lg font-semibold text-[hsl(var(--temple-text-primary))]">{apply(`${streakDays} dias`)}</p>
          </div>
          <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
              <Hourglass className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
              {apply('Tempo dedicado no ciclo')}
            </div>
            <p className="text-lg font-semibold text-[hsl(var(--temple-text-primary))]">{apply(`${formattedHours}h`)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
