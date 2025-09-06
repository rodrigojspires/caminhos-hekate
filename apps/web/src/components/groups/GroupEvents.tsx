'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  UserCheck,
  UserX
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, isFuture, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface GroupEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  type: 'MEETING' | 'WORKSHOP' | 'SOCIAL' | 'OTHER'
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  maxAttendees?: number
  isRecurring: boolean
  createdAt: string
  creator: {
    id: string
    name: string
    image?: string
  }
  _count: {
    attendees: number
  }
  userAttendance?: {
    status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE'
  }
}

interface GroupEventsProps {
  groupId: string
  currentUserId: string
  canCreateEvents: boolean
}

export function GroupEvents({ groupId, currentUserId, canCreateEvents }: GroupEventsProps) {
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<GroupEvent | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        filter,
        limit: '20'
      })
      
      const response = await fetch(`/api/groups/${groupId}/events?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar eventos')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast.error('Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
    }
  }, [groupId, filter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleCreateEvent = async (eventData: any) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar evento')
      }

      toast.success('Evento criado com sucesso!')
      setIsCreateModalOpen(false)
      fetchEvents()
    } catch (error: any) {
      console.error('Erro ao criar evento:', error)
      toast.error(error.message || 'Erro ao criar evento')
    }
  }

  const handleUpdateAttendance = async (eventId: string, status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE') => {
    try {
      const response = await fetch(`/api/groups/${groupId}/events/${eventId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar presença')
      }

      toast.success('Presença atualizada!')
      fetchEvents()
    } catch (error) {
      console.error('Erro ao atualizar presença:', error)
      toast.error('Erro ao atualizar presença')
    }
  }

  const getEventStatusColor = (event: GroupEvent) => {
    if (event.status === 'CANCELLED') return 'destructive'
    if (event.status === 'COMPLETED') return 'secondary'
    if (event.status === 'ONGOING') return 'default'
    if (isFuture(parseISO(event.startDate))) return 'default'
    return 'secondary'
  }

  const getEventTypeLabel = (type: string) => {
    const labels = {
      MEETING: 'Reunião',
      WORKSHOP: 'Workshop',
      SOCIAL: 'Social',
      OTHER: 'Outro'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getAttendanceStatusColor = (status?: string) => {
    switch (status) {
      case 'ATTENDING': return 'default'
      case 'NOT_ATTENDING': return 'destructive'
      case 'MAYBE': return 'secondary'
      default: return 'outline'
    }
  }

  const getAttendanceStatusLabel = (status?: string) => {
    switch (status) {
      case 'ATTENDING': return 'Confirmado'
      case 'NOT_ATTENDING': return 'Não vou'
      case 'MAYBE': return 'Talvez'
      default: return 'Responder'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="upcoming">Próximos</SelectItem>
              <SelectItem value="past">Passados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreateEvents && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Evento
          </Button>
        )}
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum evento encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'upcoming' 
                ? 'Não há eventos próximos agendados.'
                : filter === 'past'
                ? 'Não há eventos passados.'
                : 'Nenhum evento foi criado ainda.'}
            </p>
            {canCreateEvents && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Badge variant={getEventStatusColor(event)}>
                        {event.status === 'SCHEDULED' ? 'Agendado' :
                         event.status === 'ONGOING' ? 'Em andamento' :
                         event.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                      </Badge>
                      <Badge variant="outline">
                        {getEventTypeLabel(event.type)}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-gray-600 mb-3">{event.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(parseISO(event.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {format(parseISO(event.startDate), 'HH:mm', { locale: ptBR })}
                        {event.endDate && ` - ${format(parseISO(event.endDate), 'HH:mm', { locale: ptBR })}`}
                      </span>
                      {event.location && (
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {event._count.attendees} participantes
                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={event.creator.image} alt={event.creator.name} />
                      <AvatarFallback className="text-xs">
                        {event.creator.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getAttendanceStatusColor(event.userAttendance?.status)}>
                      {getAttendanceStatusLabel(event.userAttendance?.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.status === 'SCHEDULED' && isFuture(parseISO(event.startDate)) && (
                      <>
                        <Button
                          size="sm"
                          variant={event.userAttendance?.status === 'ATTENDING' ? 'default' : 'outline'}
                          onClick={() => handleUpdateAttendance(event.id, 'ATTENDING')}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Vou
                        </Button>
                        <Button
                          size="sm"
                          variant={event.userAttendance?.status === 'MAYBE' ? 'default' : 'outline'}
                          onClick={() => handleUpdateAttendance(event.id, 'MAYBE')}
                        >
                          Talvez
                        </Button>
                        <Button
                          size="sm"
                          variant={event.userAttendance?.status === 'NOT_ATTENDING' ? 'destructive' : 'outline'}
                          onClick={() => handleUpdateAttendance(event.id, 'NOT_ATTENDING')}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Não vou
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />
    </div>
  )
}

// Create Event Modal Component
interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
}

function CreateEventModal({ isOpen, onClose, onSubmit }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    type: 'MEETING',
    maxAttendees: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.startDate) {
      toast.error('Título e data de início são obrigatórios')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null
      })
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        type: 'MEETING',
        maxAttendees: ''
      })
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Evento</DialogTitle>
          <DialogDescription>
            Crie um novo evento para o grupo
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome do evento"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o evento"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data/Hora de Início *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data/Hora de Fim</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="location">Local</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Local do evento"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">Reunião</SelectItem>
                  <SelectItem value="WORKSHOP">Workshop</SelectItem>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxAttendees">Máx. Participantes</Label>
              <Input
                id="maxAttendees"
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                placeholder="Ilimitado"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}