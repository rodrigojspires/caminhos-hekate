'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, CreditCard, Filter, List, MapPin } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/events/Calendar'
import { EventModal } from '@/components/events/EventModal'
import { CalendarFilters } from '@/components/events/CalendarFilters'
import { useEventsStore } from '@/stores/eventsStore'
import { CalendarEvent } from '@/types/events'

export default function DashboardEventsPage() {
  const { events, loading, error, filters, fetchEvents, setFilters, registerForEvent } = useEventsStore()
  const [tabValue, setTabValue] = useState<'list' | 'calendar'>('list')
  const [listTab, setListTab] = useState<'all' | 'mine'>('all')
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (tabValue === 'list') {
      fetchEvents()
    }
  }, [tabValue, filters, fetchEvents])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })
  }, [events])

  const myEvents = useMemo(() => sortedEvents.filter((event) => event.userRegistration), [sortedEvents])
  const availableEvents = useMemo(
    () => sortedEvents.filter((event) => !event.userRegistration),
    [sortedEvents]
  )

  const formatDateParts = (date: Date) => {
    const parsed = new Date(date)
    return {
      day: parsed.toLocaleDateString('pt-BR', { day: '2-digit' }),
      month: parsed.toLocaleDateString('pt-BR', { month: 'short' }),
      year: parsed.toLocaleDateString('pt-BR', { year: 'numeric' }),
      time: parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatPrice = (value?: number | string | null) => {
    if (value === undefined || value === null) return 'Gratuito'
    const parsed = typeof value === 'string' ? parseFloat(value) : value
    if (!parsed || parsed === 0) return 'Gratuito'
    return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getAccessLabel = (event: typeof events[number]) => {
    const hasTierAccess = (event.freeTiers?.length ?? 0) > 0 || event.accessType === 'TIER'
    if (event.accessType === 'PAID') {
      return `${formatPrice(event.price)}${hasTierAccess ? ' ou incluído no plano' : ''}`
    }
    if (hasTierAccess) {
      return 'Incluído no plano'
    }
    return 'Gratuito'
  }

  const canRegister = (event: typeof events[number]) => {
    if (event.userRegistration) return false
    if (new Date(event.start) <= new Date()) return false
    if (event.maxAttendees && event.attendeeCount >= event.maxAttendees) return false
    return true
  }

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters({ ...filters, ...newFilters })
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

  const renderEventRow = (event: typeof events[number]) => {
    const dateParts = formatDateParts(event.start)

    return (
      <Card key={event.id} className="border border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/60 px-3 py-2 text-center">
                <span className="text-2xl font-bold leading-none">{dateParts.day}</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{dateParts.month}</span>
                <span className="text-[11px] text-muted-foreground">{dateParts.year}</span>
                <span className="mt-1 text-xs font-semibold">{dateParts.time}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{event.title}</h3>
                  {event.userRegistration && <Badge variant="secondary">Inscrito</Badge>}
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {event.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  )}
                  {event.virtualLink && <span>Online</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:flex-col md:items-end">
              <Badge variant="outline" className="flex items-center gap-2">
                <CreditCard className="h-3 w-3" />
                {getAccessLabel(event)}
              </Badge>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEvent(event)
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
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

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
        <div className="flex items-center justify-between">
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

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {showFilters && (
          <CalendarFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        )}
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
            <div className="space-y-4">
              <Tabs value={listTab} onValueChange={(value) => setListTab(value as 'all' | 'mine')}>
                <TabsList className="grid w-full max-w-sm grid-cols-2">
                  <TabsTrigger value="all">Todos os eventos</TabsTrigger>
                  <TabsTrigger value="mine">Meus eventos</TabsTrigger>
                </TabsList>
              </Tabs>

              {listTab === 'all' && (
                <div className="space-y-3">
                  {availableEvents.map(renderEventRow)}
                </div>
              )}

              {listTab === 'mine' && (
                <>
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
                </>
              )}
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
                  onEventClick={(event) => setSelectedEvent(event)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null)
          }}
        />
      )}
    </div>
  )
}
