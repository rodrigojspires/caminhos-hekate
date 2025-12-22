'use client'

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventCard } from './EventCard'
import { CreateEventModal } from './CreateEventModal'
import { EventModal } from './EventModal'
import { CalendarFilters } from './CalendarFilters'
import { RecurrenceIndicator } from '@/components/calendar/RecurrenceIndicator'
import { useEventsStore } from '@/stores/eventsStore'
import { CalendarEvent, RecurrenceRule } from '@/types/events'

type CalendarView = 'month' | 'week' | 'day' | 'agenda'
import { cn } from '@/lib/utils'

interface CalendarProps {
  className?: string
  defaultView?: CalendarView
  showCreateButton?: boolean
  showFilters?: boolean
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function Calendar({ 
  className, 
  defaultView = 'month',
  showCreateButton = true,
  showFilters = true 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>(defaultView)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  
  const {
    events,
    loading,
    filters,
    fetchCalendarEvents,
    setFilters
  } = useEventsStore()

  // Carregar eventos quando a data ou filtros mudarem
  useEffect(() => {
    // Determine date range based on current view
    const getDateRange = (v: CalendarView, baseDate: Date): { start: Date; end: Date } => {
      const start = new Date(baseDate)
      const end = new Date(baseDate)

      switch (v) {
        case 'day':
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
          break
        case 'week': {
          const weekStart = new Date(baseDate)
          weekStart.setDate(baseDate.getDate() - baseDate.getDay())
          weekStart.setHours(0, 0, 0, 0)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          weekEnd.setHours(23, 59, 59, 999)
          return { start: weekStart, end: weekEnd }
        }
        case 'month': {
          const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
          monthStart.setHours(0, 0, 0, 0)
          const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
          monthEnd.setHours(23, 59, 59, 999)
          return { start: monthStart, end: monthEnd }
        }
        case 'agenda': {
          const agendaStart = new Date(baseDate)
          agendaStart.setHours(0, 0, 0, 0)
          const agendaEnd = new Date(baseDate)
          agendaEnd.setDate(baseDate.getDate() + 30)
          agendaEnd.setHours(23, 59, 59, 999)
          return { start: agendaStart, end: agendaEnd }
        }
        default:
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
      }

      return { start, end }
    }

    const { start, end } = getDateRange(view, currentDate)

    fetchCalendarEvents(start, end, { ...filters })
  }, [currentDate, view, filters, fetchCalendarEvents])

  // Navegação de datas
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (view) {
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'agenda':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 30 : -30))
        break
    }
    
    setCurrentDate(newDate)
  }

  // Gerar dias do mês para visualização mensal
  const generateMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  // Obter eventos para um dia específico
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  // Renderizar cabeçalho
  const renderHeader = () => {
    const formatTitle = () => {
      switch (view) {
        case 'day':
          return currentDate.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        case 'week':
          const weekStart = new Date(currentDate)
          weekStart.setDate(currentDate.getDate() - currentDate.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          return `${weekStart.getDate()} - ${weekEnd.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        case 'month':
          return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        case 'agenda':
          return 'Próximos Eventos'
        default:
          return ''
      }
    }

    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{formatTitle()}</h1>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Seletor de visualização */}
          <div className="flex rounded-lg border">
            {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((viewOption) => (
              <Button
                key={viewOption}
                variant={view === viewOption ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView(viewOption)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {viewOption === 'month' && 'Mês'}
                {viewOption === 'week' && 'Semana'}
                {viewOption === 'day' && 'Dia'}
                {viewOption === 'agenda' && 'Agenda'}
              </Button>
            ))}
          </div>

          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          )}

          {showCreateButton && (
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          )}
        </div>
      </div>
    )
  }

  const getViewRange = (v: CalendarView, baseDate: Date) => {
    const start = new Date(baseDate)
    const end = new Date(baseDate)

    switch (v) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week': {
        const weekStart = new Date(baseDate)
        weekStart.setDate(baseDate.getDate() - baseDate.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        return { start: weekStart, end: weekEnd }
      }
      case 'month': {
        const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        return { start: monthStart, end: monthEnd }
      }
      case 'agenda': {
        const agendaStart = new Date(baseDate)
        agendaStart.setHours(0, 0, 0, 0)
        const agendaEnd = new Date(baseDate)
        agendaEnd.setDate(baseDate.getDate() + 30)
        agendaEnd.setHours(23, 59, 59, 999)
        return { start: agendaStart, end: agendaEnd }
      }
      default:
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
    }

    return { start, end }
  }

  const renderRangeView = (rangeView: 'week' | 'day') => {
    const { start, end } = getViewRange(rangeView, currentDate)
    const rangeEvents = [...events]
      .filter((event) => new Date(event.start) >= start && new Date(event.start) <= end)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    if (rangeEvents.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum evento encontrado.
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {rangeEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => setSelectedEvent(event)}
          />
        ))}
      </div>
    )
  }

  // Renderizar visualização mensal
  const renderMonthView = () => {
    const days = generateMonthDays()
    const today = new Date()
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Cabeçalho dos dias da semana */}
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="p-2 text-center font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Dias do mês */}
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === today.toDateString()
          
          return (
            <div
              key={index}
              className={cn(
                "min-h-[120px] p-2 border border-border",
                !isCurrentMonth && "bg-muted/50 text-muted-foreground",
                isToday && "bg-primary/10 border-primary"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday && "text-primary font-bold"
              )}>
                {day.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => {
                  // Simular dados de recorrência (em produção, viriam da API)
                  const isRecurring = event.title.toLowerCase().includes('recorrente') || 
                                    event.title.toLowerCase().includes('semanal') ||
                                    event.title.toLowerCase().includes('mensal')
                  const recurrenceRule: RecurrenceRule | undefined = isRecurring ? {
                    freq: event.title.toLowerCase().includes('semanal') ? 'WEEKLY' : 'MONTHLY',
                    interval: 1
                  } : undefined
                  
                  return (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80 relative text-slate-900"
                      style={{ backgroundColor: event.backgroundColor }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-1">
                            {event.title}
                            {recurrenceRule && (
                              <RecurrenceIndicator 
                                recurrenceRule={recurrenceRule} 
                                size="sm"
                              />
                            )}
                          </div>
                          <div className="text-slate-700">
                            {new Date(event.start).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Renderizar visualização de agenda
  const renderAgendaView = () => {
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    )

    if (sortedEvents.length === 0) {
      return (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum evento encontrado</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {sortedEvents.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => setSelectedEvent(event)}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {renderHeader()}
      
      {showFiltersPanel && (
        <CalendarFilters
          filters={filters as any}
          onFiltersChange={setFilters as any}
          onClose={() => setShowFiltersPanel(false)}
        />
      )}
      
      <Card>
        <CardContent className="p-6">
          {view === 'month' && renderMonthView()}
          {view === 'agenda' && renderAgendaView()}
          {view === 'week' && renderRangeView('week')}
          {view === 'day' && renderRangeView('day')}
        </CardContent>
      </Card>

      {/* Modais */}
      <CreateEventModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
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
