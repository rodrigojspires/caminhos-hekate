'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, List } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/events/Calendar'
import { EventCard } from '@/components/events/EventCard'
import { useEventsStore } from '@/stores/eventsStore'

export default function DashboardEventsPage() {
  const { events, loading, error, fetchEvents } = useEventsStore()
  const [tabValue, setTabValue] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })
  }, [events])

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
            <div className="space-y-4">
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))}
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
