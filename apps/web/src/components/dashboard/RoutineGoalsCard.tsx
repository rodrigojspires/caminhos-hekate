'use client'

import { useEffect, useMemo, useState } from 'react'
import { Flame, Hourglass, MessageCircle, Package, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface ProgressSnapshot {
  weeklyProgress: Array<{ lessons: number }>
  monthlyData: Array<{ hours: number }>
}

interface StreakItem {
  currentStreak?: number
}

interface CommunitiesResponse {
  communities: Array<{ unreadChatCount?: number }>
}

interface OrdersResponse {
  orders: Array<{ id: string; createdAt: string }>
}

export function RoutineGoalsCard() {
  const { apply } = useDashboardVocabulary()
  const [loading, setLoading] = useState(true)
  const [monthHours, setMonthHours] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [weeklyLessons, setWeeklyLessons] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [recentOrders, setRecentOrders] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [pRes, sRes, cRes, oRes] = await Promise.all([
          fetch('/api/user/progress'),
          fetch('/api/gamification/streaks?active=true'),
          fetch('/api/communities'),
          fetch('/api/user/orders')
        ])
        const pJson: ProgressSnapshot = pRes.ok ? await pRes.json() : { monthlyData: [], weeklyProgress: [] }
        const sJson: StreakItem[] = sRes.ok ? await sRes.json() : []
        const cJson: CommunitiesResponse = cRes.ok ? await cRes.json() : { communities: [] }
        const oJson: OrdersResponse = oRes.ok ? await oRes.json() : { orders: [] }

        if (cancelled) return

        const last = pJson.monthlyData?.length
          ? pJson.monthlyData[pJson.monthlyData.length - 1]
          : { hours: 0 }
        setMonthHours(Number(last?.hours || 0))

        const weeklyTotal = (pJson.weeklyProgress || []).reduce((sum, item) => sum + Number(item.lessons || 0), 0)
        setWeeklyLessons(weeklyTotal)

        const current = Array.isArray(sJson)
          ? Math.max(0, ...sJson.map((x) => Number(x.currentStreak || 0)))
          : 0
        setStreakDays(Number.isFinite(current) ? current : 0)

        const unreadTotal = (cJson.communities || []).reduce(
          (sum, item) => sum + Number(item.unreadChatCount || 0),
          0
        )
        setUnreadMessages(unreadTotal)

        setRecentOrders(oJson.orders?.length || 0)
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
          {apply('Metas reais do seu ciclo com cursos, comunidade e produtos.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
              <Sparkles className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
              {apply('Ritos na semana')}
            </div>
            <p className="text-lg font-semibold text-[hsl(var(--temple-text-primary))]">{apply(`${weeklyLessons} ritos`)}</p>
            <p className="text-xs text-[hsl(var(--temple-text-secondary))]">{apply('Meta sugerida: 5')}</p>
          </div>
          <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
              <MessageCircle className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
              {apply('Comunidade em aberto')}
            </div>
            <p className="text-lg font-semibold text-[hsl(var(--temple-text-primary))]">{apply(`${unreadMessages} mensagens`)}</p>
            <p className="text-xs text-[hsl(var(--temple-text-secondary))]">{apply('Meta sugerida: 2 respostas')}</p>
          </div>
          <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
              <Package className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
              {apply('Produtos explorados')}
            </div>
            <p className="text-lg font-semibold text-[hsl(var(--temple-text-primary))]">{apply(`${recentOrders} pedidos`)}</p>
            <p className="text-xs text-[hsl(var(--temple-text-secondary))]">{apply('Meta sugerida: 1')}</p>
          </div>
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
