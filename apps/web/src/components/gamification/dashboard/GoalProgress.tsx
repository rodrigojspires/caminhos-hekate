"use client"

import { useEffect, useState } from 'react'
import { CalendarClock, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { resolveMediaUrl } from '@/lib/utils'

interface GoalItem {
  goal: {
    id: string
    title: string
    description?: string | null
    goalType: string
    metric: string
    targetValue: number
    endDate: string
    rewardMode?: string | null
    points: number
    achievement?: { id: string; name: string; icon?: string | null } | null
  }
  progress: {
    currentValue: number
    targetValue: number
    percent: number
    completedAt: string | null
  }
}

export function GoalProgress() {
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/gamification/goals')
        if (!response.ok) throw new Error('Falha ao carregar metas')
        const data = await response.json()
        if (!cancelled) setGoals(data.goals || [])
      } catch {
        if (!cancelled) setGoals([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metas do Ciclo
        </CardTitle>
        <CardDescription>
          Desafios ativos para ganhar pontos e emblemas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando metas...</div>
        ) : goals.length ? (
          goals.map((item) => {
            const remaining = Math.max(0, item.goal.targetValue - item.progress.currentValue)
            const endDate = new Date(item.goal.endDate).toLocaleDateString('pt-BR')
            const rewardLabel = item.goal.rewardMode === 'POINTS'
              ? 'Somente pontos'
              : item.goal.rewardMode === 'BADGE'
                ? 'Somente emblema'
                : 'Pontos + emblema'
            return (
              <div key={item.goal.id} className="rounded-lg border border-[hsl(var(--temple-border-subtle))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {item.goal.achievement?.icon && (
                      <img
                        src={resolveMediaUrl(item.goal.achievement.icon) || item.goal.achievement.icon}
                        alt={item.goal.achievement.name}
                        className="h-10 w-10 rounded-md object-cover border border-[hsl(var(--temple-border-subtle))]"
                      />
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[hsl(var(--temple-text-primary))]">{item.goal.title}</p>
                    <p className="text-xs text-[hsl(var(--temple-text-secondary))]">
                      {item.goal.description || 'Meta em andamento'}
                    </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="temple-chip text-xs">
                    {item.progress.completedAt ? 'Concluída' : `${remaining} faltando`}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2">
                  <Progress value={item.progress.percent} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
                    <span>{item.progress.currentValue}/{item.goal.targetValue}</span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      até {endDate}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
                  <Badge variant="outline" className="temple-chip text-[10px]">
                    {item.goal.goalType}
                  </Badge>
                  <Badge variant="outline" className="temple-chip text-[10px]">
                    {item.goal.metric}
                  </Badge>
                  {item.goal.points > 0 && (
                    <Badge variant="secondary" className="temple-chip text-[10px]">
                      {item.goal.points} pontos
                    </Badge>
                  )}
                  <Badge variant="outline" className="temple-chip text-[10px]">
                    {rewardLabel}
                  </Badge>
                  {item.goal.achievement?.name && (
                    <Badge variant="outline" className="temple-chip text-[10px]">
                      Emblema: {item.goal.achievement.name}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-sm text-muted-foreground">
            Nenhuma meta ativa no momento.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
