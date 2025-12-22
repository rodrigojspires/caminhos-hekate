'use client'

import React, { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  ExternalLink, 
  Share2, 
  Download,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Bell,
  BellOff
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CalendarEvent, EventType, EventRegistrationStatus } from '@/types/events'
import { cn } from '@/lib/utils'
import { useEventsStore } from '@/stores/eventsStore'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface EventModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.WEBINAR]: 'Webinar',
  [EventType.WORKSHOP]: 'Workshop',
  [EventType.COURSE]: 'Curso',
  [EventType.MEETING]: 'Reunião',
  [EventType.COMMUNITY]: 'Comunidade',
  [EventType.CONFERENCE]: 'Conferência',
  [EventType.NETWORKING]: 'Networking',
  [EventType.TRAINING]: 'Treinamento'
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

export function EventModal({ event, open, onOpenChange, onEdit }: EventModalProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { registerForEvent, cancelRegistration, deleteEvent } = useEventsStore()
  const { data: session } = useSession()
  const user = session?.user

  if (!event) return null

  const startDate = new Date(event.start)
  const endDate = new Date(event.end)
  const isUpcoming = startDate > new Date()
  const isOngoing = startDate <= new Date() && endDate >= new Date()
  const isPast = endDate < new Date()
  const isCreator = user?.id && event.creator?.id ? user.id === event.creator.id : false

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = () => {
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ''}`
    }
    return `${diffMinutes}min`
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

  const getBaseEventId = (id: string) => id.replace(/-r\d+$/, '')

  const handleRegister = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para se inscrever')
      return
    }

    setIsRegistering(true)
    try {
      await registerForEvent(getBaseEventId(event.id), {
        recurrenceInstanceStart: new Date(event.start).toISOString(),
        recurrenceInstanceId: event.id
      })
      toast.success('Inscrição realizada com sucesso!')
    } catch (error) {
      toast.error('Erro ao realizar inscrição')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleCancelRegistration = async () => {
    if (!user || !event.userRegistration) return

    setIsRegistering(true)
    try {
      await cancelRegistration(getBaseEventId(event.id))
      toast.success('Inscrição cancelada com sucesso!')
    } catch (error) {
      toast.error('Erro ao cancelar inscrição')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDelete = async () => {
    if (!isCreator) return

    setIsDeleting(true)
    try {
      await deleteEvent(getBaseEventId(event.id))
      toast.success('Evento excluído com sucesso!')
      onOpenChange(false)
    } catch (error) {
      toast.error('Erro ao excluir evento')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: window.location.href
        })
      } catch (error) {
        // Fallback para clipboard
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copiado para a área de transferência!')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado para a área de transferência!')
    }
  }

  const handleExportToCalendar = () => {
    const startISO = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endISO = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Caminhos de Hekate//Event//PT',
      'BEGIN:VEVENT',
      `UID:${event.id}@caminhosdehekate.com`,
      `DTSTART:${startISO}`,
      `DTEND:${endISO}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      `URL:${event.virtualLink || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success('Evento exportado para o calendário!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                {event.title}
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Badge 
                  className={EVENT_TYPE_COLORS[event.type]}
                  variant="outline"
                >
                  {EVENT_TYPE_LABELS[event.type]}
                </Badge>
                {getStatusBadge()}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportToCalendar}>
                <Download className="h-4 w-4" />
              </Button>
              {isCreator && (
                <>
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="attendees">Participantes</TabsTrigger>
              <TabsTrigger value="reminders">Lembretes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Informações básicas */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Data e Horário</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(startDate)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duração: {formatDuration()}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Local</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                )}

                {event.virtualLink && (
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Link Virtual</p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm"
                        onClick={() => window.open(event.virtualLink, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Acessar evento online
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Participantes</p>
                    <p className="text-sm text-muted-foreground">
                      {event.attendeeCount} inscrito{event.attendeeCount !== 1 ? 's' : ''}
                      {event.maxAttendees && ` de ${event.maxAttendees} vagas`}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Descrição */}
              {event.description && (
                <div>
                  <h3 className="font-semibold mb-2">Descrição</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Criador */}
              <div>
                <h3 className="font-semibold mb-2">Organizador</h3>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={event.creator?.image || ''} alt={event.creator?.name || 'Criador do evento'} />
                    <AvatarFallback>
                      {event.creator?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{event.creator?.name || 'Organização'}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.creator?.email || ''}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendees" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Participantes ({event.attendeeCount})
                  </h3>
                  {isCreator && (
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convidar
                    </Button>
                  )}
                </div>
                
                {/* Lista de participantes seria carregada aqui */}
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Lista de participantes será carregada aqui</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reminders" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Lembretes</h3>
                  <Button size="sm" variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Adicionar Lembrete
                  </Button>
                </div>
                
                {/* Lista de lembretes seria carregada aqui */}
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum lembrete configurado</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {event.userRegistration ? (
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={event.userRegistration.status === 'CONFIRMED' ? 'default' : 'secondary'}
                  >
                    {event.userRegistration.status === 'CONFIRMED' && 'Confirmado'}
                    {event.userRegistration.status === 'PENDING' && 'Pendente'}
                    {event.userRegistration.status === 'CANCELLED' && 'Cancelado'}
                  </Badge>
                  
                  {event.userRegistration.status !== 'CANCELLED' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancelRegistration}
                      disabled={isRegistering}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Cancelar Inscrição
                    </Button>
                  )}
                </div>
              ) : (
                event.canRegister && (
                  <Button 
                    onClick={handleRegister}
                    disabled={isRegistering}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isRegistering ? 'Inscrevendo...' : 'Inscrever-se'}
                  </Button>
                )
              )}
            </div>

            <div className="flex items-center space-x-2">
              {event.virtualLink && isOngoing && (
                <Button onClick={() => window.open(event.virtualLink, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Entrar no Evento
                </Button>
              )}
              
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
