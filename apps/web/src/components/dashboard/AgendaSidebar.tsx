'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED' | string

interface EventItem {
  id: string
  title: string
  startDate?: string
  status?: EventStatus
}

interface EventsResponse {
  events: EventItem[]
}

const statusLabel = (status?: EventStatus) => {
  if (status === 'COMPLETED') return 'Encerrado'
  if (status === 'CANCELED') return 'Cancelado'
  if (status === 'DRAFT') return 'Em preparo'
  return 'Aberto'
}

const statusTone = (status?: EventStatus) => {
  if (status === 'COMPLETED') return 'bg-[hsl(var(--temple-surface-3))] text-[hsl(var(--temple-text-secondary))]'
  if (status === 'CANCELED') return 'bg-red-500/10 text-red-300'
  if (status === 'DRAFT') return 'bg-yellow-500/10 text-yellow-300'
  return 'bg-emerald-500/10 text-emerald-200'
}

const formatDate = (value?: string) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  })
}

export function AgendaSidebar() {
  const { apply } = useDashboardVocabulary()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/events?limit=6&status=PUBLISHED')
        if (!response.ok) throw new Error('Erro ao carregar eventos')
        const data: EventsResponse = await response.json()
        if (!cancelled) setEvents(data.events || [])
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((ev) => ev.startDate)
      .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime())
      .slice(0, 4)
  }, [events])

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="text-lg temple-section-title">{apply('Agenda Sagrada')}</CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {apply('Encontros e rituais que estão por vir.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[hsl(var(--temple-border-subtle))] p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40 mt-2" />
              </div>
            ))}
          </>
        ) : upcomingEvents.length ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[hsl(var(--temple-text-primary))]">{event.title}</p>
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--temple-text-secondary))]">
                    <span>{formatDate(event.startDate)}</span>
                    <Badge className={`text-[10px] ${statusTone(event.status)}`}>{apply(statusLabel(event.status))}</Badge>
                  </div>
                </div>
                <CalendarDays className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-6 text-center">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--temple-accent-gold))]" />
            <p className="text-sm text-[hsl(var(--temple-text-secondary))]">
              {apply('Nenhum encontro agendado.')}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--temple-text-primary))]">
            <Users className="h-4 w-4 text-[hsl(var(--temple-accent-gold))]" />
            {apply('Encontros da comunidade')}
          </div>
          <p className="text-xs text-[hsl(var(--temple-text-secondary))] mt-1">
            {apply('Veja os encontros ativos e as salas de troca entre alunos.')}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href="/dashboard/comunidades">{apply('Ver comunidades')}</Link>
          </Button>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/eventos">{apply('Ver agenda completa')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
