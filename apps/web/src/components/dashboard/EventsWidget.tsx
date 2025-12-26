'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, List, Loader2, MapPin, RefreshCw, Wifi, Moon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED' | string

interface EventItem {
  id: string
  title: string
  description?: string | null
  startDate?: string
  endDate?: string
  status?: EventStatus
  category?: string | null
  accessType?: 'FREE' | 'PAID' | 'TIER'
  price?: number | string | null
  freeTiers?: string[]
  mode?: 'ONLINE' | 'IN_PERSON' | 'HYBRID'
}

type ViewMode = 'list' | 'calendar'

const STATUS_COLORS: Record<EventStatus, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELED: 'bg-red-100 text-red-700'
}

const formatDate = (value?: string) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  })
}

const formatPrice = (value?: number | string | null) => {
  if (value === undefined || value === null) return 'Gratuito'
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  if (!parsed || parsed === 0) return 'Gratuito'
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const getAccessLabel = (event: EventItem) => {
  const hasTierAccess = (event.freeTiers?.length ?? 0) > 0 || event.accessType === 'TIER'
  if (event.accessType === 'PAID') {
    return `${formatPrice(event.price)}${hasTierAccess ? ' ou incluído no plano' : ''}`
  }
  if (hasTierAccess) {
    return `Incluído (${event.freeTiers?.join(', ') || 'tiers'})`
  }
  return 'Gratuito'
}

export function EventsWidget() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      await new Promise(res => setTimeout(res, 500)) // Simulate loading
      const res = await fetch('/api/events?limit=50&status=PUBLISHED')
      if (!res.ok) throw new Error('Erro ao carregar eventos')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Erro ao carregar eventos do dashboard:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const eventsSorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
        return aDate - bDate
      }),
    [events]
  )

  const daysInMonth = useMemo(() => {
    const start = new Date(currentMonth)
    const firstDayIndex = start.getDay()
    const days = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const cells: { day: number | null; date?: Date }[] = []

    for (let i = 0; i < firstDayIndex; i++) cells.push({ day: null })
    for (let day = 1; day <= days; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      cells.push({ day, date })
    }
    return cells
  }, [currentMonth])

  const getEventsForDay = (date?: Date) => {
    if (!date) return []
    return events.filter((ev) => {
      if (!ev.startDate) return false
      const start = new Date(ev.startDate)
      return (
        start.getFullYear() === date.getFullYear() &&
        start.getMonth() === date.getMonth() &&
        start.getDate() === date.getDate()
      )
    })
  }

  const changeMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <Card className="glass-dark border border-hekate-gold/20">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-serif text-hekate-goldLight">Próximos Alinhamentos</CardTitle>
          <CardDescription className="text-hekate-pearl/70">Consulte os próximos rituais, encontros e alinhamentos cósmicos da nossa egrégora.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-black/20 rounded-lg p-1 flex items-center">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1"
            >
              <List className="h-4 w-4" /> Lista
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="gap-1"
            >
              <Moon className="h-4 w-4" /> Calendário Lunar
            </Button>
          </div>
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
                ‹
              </Button>
              <div className="text-sm font-medium min-w-[130px] text-center text-hekate-pearl">
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} aria-label="Próximo mês">
                ›
              </Button>
            </div>
          )}
          <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-hekate-pearl/60">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando os astros...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-hekate-pearl/60">
            <CalendarDays className="h-10 w-10 mx-auto mb-3" />
            <p className="font-semibold">Nenhum alinhamento agendado.</p>
            <p className="text-sm">O oráculo está em silêncio por agora.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {eventsSorted.map((event) => (
              <div
                key={event.id}
                className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-hekate-gold/20 bg-black/20 px-4 py-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-hekate-pearl">{event.title}</span>
                    {event.mode && (
                      <Badge variant="secondary" className="gap-1 text-xs border border-hekate-purple/50 bg-hekate-purple/10 text-hekate-purple-300">
                        {event.mode === 'IN_PERSON' ? <MapPin className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                        {event.mode === 'IN_PERSON' ? 'Presencial' : event.mode === 'HYBRID' ? 'Híbrido' : 'Online'}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-hekate-gold/50 text-hekate-gold">{getAccessLabel(event)}</Badge>
                  </div>
                  {event.description && (
                    <p className="text-sm text-hekate-pearl/70 mt-1 line-clamp-2">{event.description}</p>
                  )}
                   <div className="flex flex-wrap items-center gap-3 text-xs text-hekate-pearl/60 mt-2">
                    <span>
                      {formatDate(event.startDate)}
                      {event.endDate ? ` — ${formatDate(event.endDate)}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-7 text-xs font-medium text-hekate-pearl/50 px-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {daysInMonth.map((cell, idx) => {
                const dayEvents = getEventsForDay(cell.date)
                const isToday = cell.date && new Date().toDateString() === cell.date.toDateString()
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] rounded-md border p-2 text-sm transition-colors duration-300 ${
                      cell.day ? 'bg-black/20 border-hekate-gold/20' : 'bg-black/10 border-transparent'
                    } ${isToday ? 'border-hekate-gold' : ''}`}
                  >
                    {cell.day && (
                      <div className={`text-right text-xs font-semibold mb-2 ${isToday ? 'text-hekate-gold' : 'text-hekate-pearl/50'}`}>
                        {cell.day}
                      </div>
                    )}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="rounded bg-hekate-purple/20 text-hekate-purple-300 px-2 py-1 text-[10px] font-semibold line-clamp-1 cursor-pointer hover:bg-hekate-purple/30"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-hekate-pearl/50">+{dayEvents.length - 2} mais</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
