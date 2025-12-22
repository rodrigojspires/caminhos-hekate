'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, List, MapPin, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/events/Calendar'
import { useEventsStore } from '@/stores/eventsStore'

export default function DashboardEventsPage() {
  const router = useRouter()
  const { events, loading, error, fetchEvents, registerForEvent } = useEventsStore()
  const [tabValue, setTabValue] = useState<'list' | 'calendar'>('list')
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (tabValue === 'list') {
      fetchEvents()
    }
  }, [tabValue, fetchEvents])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })
  }, [events])

  const myEvents = useMemo(() => sortedEvents.filter((event) => event.userRegistration), [sortedEvents])

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  const formatPrice = (value?: number | string | null) => {
    if (value === undefined || value === null) return 'Gratuito'
    const parsed = typeof value === 'string' ? parseFloat(value) : value
    if (!parsed || parsed === 0) return 'Gratuito'
    return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const canRegister = (event: typeof events[number]) => {
    if (event.userRegistration) return false
    if (new Date(event.start) <= new Date()) return false
    if (event.maxAttendees && event.attendeeCount >= event.maxAttendees) return false
    return true
  }

  const handleRegister = async (event: typeof events[number]) => {
    setRegisteringId(event.id)
    try {
      await registerForEvent(getBaseEventId(event.id), {
        recurrenceInstanceStart: new Date(event.start).toISOString(),
        recurrenceInstanceId: event.id
      })
      await fetchEvents()
    } finally {
      setRegisteringId(null)
    }
  }

  const getBaseEventId = (id: string) => id.replace(/-r\d+$/, '')

  const renderEventRow = (event: typeof events[number]) => (
    <Card key={event.id} className="border border-border/70">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{event.title}</h3>
              {event.userRegistration && (
                <Badge variant="secondary">Inscrito</Badge>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
            )}
          </div>
          <Badge variant="outline">{formatPrice(event.price)}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {formatDateTime(event.start)}
          </span>
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
          {event.virtualLink && (
            <span className="truncate">
              Online
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const baseId = getBaseEventId(event.id)
              const params = new URLSearchParams()
              params.set('occurrenceStart', new Date(event.start).toISOString())
              params.set('occurrenceEnd', new Date(event.end).toISOString())
              params.set('occurrenceId', event.id)
              router.push(`/eventos/${baseId}?${params.toString()}`)
            }}
          >
            Ver detalhes
          </Button>
          {canRegister(event) && (
            <Button
              size="sm"
              onClick={() => handleRegister(event)}
              disabled={registeringId === event.id}
            >
              {registeringId === event.id ? 'Inscrevendo...' : 'Inscrever-se'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground">
          Acompanhe os eventos da comunidade e alterne entre lista e calendario.
        </p>
      </div>

      <Tabs
        value={tabValue}
        onValueChange={(value) => setTabValue(value as 'list' | 'calendar')}
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
            </Card>
          ) : sortedEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum evento encontrado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Meus eventos</h2>
                  <span className="text-sm text-muted-foreground">{myEvents.length} inscrito(s)</span>
                </div>
                {myEvents.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      Você ainda não está inscrito em nenhum evento.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {myEvents.map(renderEventRow)}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Todos os eventos</h2>
                  <span className="text-sm text-muted-foreground">{sortedEvents.length} eventos</span>
                </div>
                <div className="space-y-3">
                  {sortedEvents.map(renderEventRow)}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-6">
              {tabValue === 'calendar' && (
                <Calendar
                  defaultView="month"
                  showCreateButton={false}
                  showFilters={false}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
