'use client'

import React from 'react'
import { BookOpen, Calendar, Clock, CreditCard, ExternalLink, Hammer, HeartPulse, MapPin, Shuffle, Sparkles, Users, Video, Wifi } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarEvent, EventType } from '@/types/events'
import { RecurrenceIndicator } from '@/components/calendar/RecurrenceIndicator'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EventCardProps {
  event: CalendarEvent
  onClick?: () => void
  showActions?: boolean
  compact?: boolean
  className?: string
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.WEBINAR]: 'Ritual',
  [EventType.WORKSHOP]: 'Workshop',
  [EventType.COURSE]: 'Curso',
  [EventType.MEETING]: 'Terapia',
  [EventType.COMMUNITY]: 'Ritual',
  [EventType.CONFERENCE]: 'Ritual',
  [EventType.NETWORKING]: 'Ritual',
  [EventType.TRAINING]: 'Workshop'
}

const EVENT_TYPE_ICONS: Record<EventType, LucideIcon> = {
  [EventType.WEBINAR]: Sparkles,
  [EventType.WORKSHOP]: Hammer,
  [EventType.COURSE]: BookOpen,
  [EventType.MEETING]: HeartPulse,
  [EventType.COMMUNITY]: Sparkles,
  [EventType.CONFERENCE]: Sparkles,
  [EventType.NETWORKING]: Sparkles,
  [EventType.TRAINING]: Hammer
}

const EVENT_MODE_LABELS: Record<string, string> = {
  IN_PERSON: 'Presencial',
  HYBRID: 'Hibrido',
  ONLINE: 'Online'
}

const EVENT_MODE_ICONS: Record<string, LucideIcon> = {
  IN_PERSON: MapPin,
  HYBRID: Shuffle,
  ONLINE: Wifi
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  [EventType.WEBINAR]: 'bg-blue-100 text-blue-800 border-blue-200',
  [EventType.WORKSHOP]: 'bg-green-100 text-green-800 border-green-200',
  [EventType.COURSE]: 'bg-purple-100 text-purple-800 border-purple-200',
  [EventType.MEETING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [EventType.COMMUNITY]: 'bg-red-100 text-red-800 border-red-200',
  [EventType.CONFERENCE]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [EventType.NETWORKING]: 'bg-orange-100 text-orange-800 border-orange-200',
  [EventType.TRAINING]: 'bg-teal-100 text-teal-800 border-teal-200'
}

export function EventCard({ 
  event, 
  onClick, 
  showActions = true, 
  compact = false,
  className 
}: EventCardProps) {
  const startDate = new Date(event.start)
  const endDate = new Date(event.end)
  const isUpcoming = startDate > new Date()
  const isOngoing = startDate <= new Date() && endDate >= new Date()
  const isPast = endDate < new Date()
  const isPaid = event.accessType === 'PAID'
  const hasTierAccess = (event.freeTiers?.length ?? 0) > 0 || event.accessType === 'TIER'
  const typeLabel = EVENT_TYPE_LABELS[event.type]
  const TypeIcon = EVENT_TYPE_ICONS[event.type]
  const modeLabel = event.mode ? EVENT_MODE_LABELS[event.mode] || event.mode : undefined
  const ModeIcon = event.mode ? EVENT_MODE_ICONS[event.mode] || Wifi : undefined

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = () => {
    if (isOngoing) {
      return <Badge variant="destructive" className="animate-pulse">Ao Vivo</Badge>
    }
    if (isPast) {
      return <Badge variant="secondary">Finalizado</Badge>
    }
    if (isUpcoming) {
      return <Badge variant="default">Em Breve</Badge>
    }
    return null
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const formatPrice = (value?: number | string | null) => {
    if (value === undefined || value === null) return 'Gratuito'
    const parsed = typeof value === 'string' ? parseFloat(value) : value
    if (!parsed || parsed === 0) return 'Gratuito'
    return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const handlePrimaryAction = () => {
    if (isPaid && !hasTierAccess) {
      window.location.href = `/checkout?eventId=${event.id}`
      return
    }
    handleCardClick()
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  if (compact) {
    return (
      <div
        className={cn(
          "p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
          className
        )}
        style={{ 
          backgroundColor: event.backgroundColor,
          borderColor: event.borderColor 
        }}
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 mb-1">
              <h4 className="font-medium text-sm truncate">{event.title}</h4>
              {/* Indicador de recorrência para versão compacta */}
              {event.title.includes('Recorrente') && (
                <RecurrenceIndicator 
                  isRecurring={true}
                  isException={event.title.includes('Exceção')}
                  size="xs"
                />
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(startDate)}
              {event.location && (
                <>
                  <span className="mx-2">•</span>
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate">{event.location}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge 
              className={cn("text-xs gap-1", EVENT_TYPE_COLORS[event.type])}
              variant="outline"
            >
              <TypeIcon className="h-3 w-3" />
              <span>Tipo: {typeLabel}</span>
            </Badge>
            {modeLabel && ModeIcon && (
              <Badge variant="secondary" className="text-xs gap-1">
                <ModeIcon className="h-3 w-3" />
                <span>Formato: {modeLabel}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200",
        isOngoing && "ring-2 ring-red-500 ring-opacity-50",
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold truncate">{event.title}</h3>
                {/* Indicador de recorrência */}
                {event.title.includes('Recorrente') && (
                  <RecurrenceIndicator 
                    isRecurring={true}
                    isException={event.title.includes('Exceção')}
                    size="sm"
                  />
                )}
                {getStatusBadge()}
              </div>
              
              <Badge 
                className={cn("gap-1", EVENT_TYPE_COLORS[event.type])}
                variant="outline"
              >
                <TypeIcon className="h-3 w-3" />
                <span>Tipo: {typeLabel}</span>
              </Badge>
              {modeLabel && ModeIcon && (
                <Badge variant="secondary" className="gap-1">
                  <ModeIcon className="h-3 w-3" />
                  <span>Formato: {modeLabel}</span>
                </Badge>
              )}
              <Badge variant={isPaid ? 'outline' : 'default'} className="gap-1">
                <CreditCard className="h-3 w-3" />
                {isPaid
                  ? `${formatPrice(event.price)}${hasTierAccess ? ' ou incluído no plano' : ''}`
                  : hasTierAccess
                    ? 'Incluído no plano'
                    : 'Gratuito'}
              </Badge>
            </div>
          </div>
        </div>

        {event.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          {/* Data e hora */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              {formatDate(startDate)} às {formatTime(startDate)}
              {startDate.toDateString() !== endDate.toDateString() && (
                <> até {formatDate(endDate)} às {formatTime(endDate)}</>
              )}
            </span>
          </div>

          {/* Local */}
          {event.location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Link virtual */}
          {event.virtualLink && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Video className="h-4 w-4 mr-2" />
              <span>Evento online</span>
            </div>
          )}

          {/* Participantes */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            <span>
              {event.attendeeCount} participante{event.attendeeCount !== 1 ? 's' : ''}
              {event.maxAttendees && ` de ${event.maxAttendees}`}
            </span>
          </div>
        </div>

        {/* Criador - removido pois não existe no tipo CalendarEvent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Evento
            </span>
          </div>
        </div>

        {/* Ações */}
        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                onClick={(e) => handleActionClick(e, handlePrimaryAction)}
              >
                {isPaid && !hasTierAccess ? 'Ir para o checkout' : 'Inscrever-se'}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {event.virtualLink && isOngoing && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => handleActionClick(e, () => {
                    window.open(event.virtualLink, '_blank')
                  })}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Entrar
                </Button>
              )}

              <Button size="sm" variant="outline">
                Ver detalhes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
