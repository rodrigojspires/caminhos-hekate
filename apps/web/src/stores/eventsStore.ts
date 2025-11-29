import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { toast } from 'sonner'
import type {
  CalendarEvent,
  Event,
  EventFilters,
  EventRegistration,
  CreateEventRequest,
  UpdateEventRequest,
  EventRegistrationRequest,
  EventsResponse
} from '@/types/events'
import { EventStatus, EventType } from '@/types/events'

interface EventsState {
  // Estado
  events: CalendarEvent[]
  selectedEvent: Event | null
  loading: boolean
  error: string | null
  filters: EventFilters
  view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'
  currentDate: Date
  
  // Ações de estado
  setSelectedEvent: (event: Event | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<EventFilters>) => void
  clearFilters: () => void
  setView: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek') => void
  setCurrentDate: (date: Date) => void
  
  // Ações de API
  fetchEvents: (filters?: Partial<EventFilters>) => Promise<void>
  fetchCalendarEvents: (startDate: Date, endDate: Date, filters?: Partial<EventFilters>) => Promise<void>
  fetchEventById: (id: string) => Promise<void>
  createEvent: (eventData: CreateEventRequest) => Promise<CalendarEvent | null>
  updateEvent: (id: string, eventData: UpdateEventRequest) => Promise<CalendarEvent | null>
  deleteEvent: (id: string) => Promise<boolean>
  registerForEvent: (eventId: string, registrationData?: EventRegistrationRequest) => Promise<boolean>
  cancelRegistration: (eventId: string) => Promise<boolean>
  approveRegistration: (eventId: string, userId: string) => Promise<boolean>
  rejectRegistration: (eventId: string, userId: string) => Promise<boolean>
  fetchEventAttendees: (eventId: string) => Promise<EventRegistration[]>
}

const defaultFilters: EventFilters = {
  search: '',
  startDate: undefined,
  endDate: undefined,
  type: [],
  tags: [],
  createdBy: undefined,
  status: undefined
}

export const useEventsStore = create<EventsState>()(devtools(
  (set, get) => ({
    // Estado inicial
    events: [],
    selectedEvent: null,
    loading: false,
    error: null,
    filters: defaultFilters,
    view: 'dayGridMonth',
    currentDate: new Date(),
    
    // Ações de estado
    setSelectedEvent: (event) => set({ selectedEvent: event }),
    
    setLoading: (loading) => set({ loading }),
    
    setError: (error) => set({ error }),
    
    setFilters: (newFilters) => set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 }
    })),
    
    clearFilters: () => set({ filters: defaultFilters }),
    
    setView: (view) => set({ view }),
    
    setCurrentDate: (currentDate) => set({ currentDate }),
    
    // Ações de API
    fetchEvents: async (filters) => {
      set({ loading: true, error: null })
      
      try {
        const currentFilters = { ...get().filters, ...filters }
        const params = new URLSearchParams()
        
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()))
            } else {
              params.append(key, value.toString())
            }
          }
        })
        
        const response = await fetch(`/api/events?${params}`)
        
        if (!response.ok) {
          throw new Error('Falha ao buscar eventos')
        }
        
        const data: EventsResponse = await response.json()
        
        // Converter Event[] para CalendarEvent[] no formato da UI
        const calendarEvents: CalendarEvent[] = data.events.map((event: Event) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.startDate),
          end: new Date(event.endDate),
          allDay: false,
          type: event.type,
          status: event.status,
          location: event.location,
          virtualLink: event.virtualLink,
          description: event.description,
          attendeeCount: 0,
          maxAttendees: event.maxAttendees,
          accessType: event.accessType,
          price: event.price ? Number(event.price) : null,
          mode: event.mode,
          freeTiers: event.freeTiers
        }))
        
        set({ 
          events: calendarEvents,
          loading: false 
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error('Erro ao carregar eventos')
      }
    },
    
    fetchCalendarEvents: async (startDate, endDate, filters) => {
      set({ loading: true, error: null })
      
      try {
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v.toString()))
              } else {
                params.append(key, value.toString())
              }
            }
          })
        }
        
        const response = await fetch(`/api/calendar?${params}`)
        
        if (!response.ok) {
          throw new Error('Falha ao buscar eventos do calendário')
        }
        
        const apiEvents: any[] = await response.json()
        
        // Mapear para o formato esperado pela UI
        const calendarEvents: CalendarEvent[] = apiEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: new Date(e.start),
          end: new Date(e.end),
          allDay: e.allDay ?? false,
          backgroundColor: e.backgroundColor,
          borderColor: e.borderColor,
          textColor: e.textColor,
          url: e.url,
          classNames: e.classNames,
          display: e.display,
          overlap: e.overlap,
          constraint: e.constraint,
          editable: e.editable,
          startEditable: e.startEditable,
          durationEditable: e.durationEditable,
          resourceEditable: e.resourceEditable,
          type: e.type ?? e.extendedProps?.type ?? EventType.MEETING,
          status: e.status ?? e.extendedProps?.status ?? EventStatus.PUBLISHED,
          location: e.location ?? e.extendedProps?.event?.location,
          virtualLink: e.virtualLink ?? e.extendedProps?.event?.virtualLink,
          description: e.description ?? e.extendedProps?.event?.description,
          attendeeCount: e.attendeeCount ?? e.extendedProps?.registrationCount ?? 0,
          maxAttendees: e.maxAttendees ?? e.extendedProps?.maxAttendees,
          tags: e.tags ?? e.extendedProps?.event?.tags,
          creator: e.creator ?? e.extendedProps?.event?.creator,
          canRegister: e.canRegister,
          userRegistration: e.userRegistration
        }))
        
        set({ 
          events: calendarEvents,
          loading: false 
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error('Erro ao carregar calendário')
      }
    },

    fetchEventById: async (id) => {
      set({ loading: true, error: null })
      try {
        const response = await fetch(`/api/events/${id}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Falha ao buscar evento')
        }
        const event: Event = await response.json()
        set({ selectedEvent: event, loading: false })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false, selectedEvent: null })
        toast.error('Erro ao carregar evento')
      }
    },
    
    createEvent: async (eventData) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha ao criar evento')
        }
        
        const newEvent: CalendarEvent = await response.json()
        
        set((state) => ({
          events: [...state.events, newEvent],
          loading: false
        }))
        
        toast.success('Evento criado com sucesso!')
        return newEvent
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao criar evento: ${errorMessage}`)
        return null
      }
    },
    
    updateEvent: async (id, eventData) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha ao atualizar evento')
        }
        
        const updatedEvent: CalendarEvent = await response.json()
        
        set((state) => ({
          events: state.events.map(event => 
            event.id === id ? updatedEvent : event
          ),
          loading: false
        }))

        // Se o evento selecionado for o mesmo, recarregar detalhes completos
        const currentSelected = get().selectedEvent
        if (currentSelected?.id === id) {
          await get().fetchEventById(id)
        }
        
        toast.success('Evento atualizado com sucesso!')
        return updatedEvent
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao atualizar evento: ${errorMessage}`)
        return null
      }
    },
    
    deleteEvent: async (id) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha ao deletar evento')
        }
        
        set((state) => ({
          events: state.events.filter(event => event.id !== id),
          selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
          loading: false
        }))
        
        toast.success('Evento deletado com sucesso!')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao deletar evento: ${errorMessage}`)
        return false
      }
    },
    
    registerForEvent: async (eventId, registrationData) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${eventId}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData || {})
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))

          if (response.status === 402 && errorData.checkoutUrl) {
            // Evento pago -> redirecionar para checkout
            window.location.href = errorData.checkoutUrl
            set({ loading: false })
            return false
          }

          throw new Error(errorData.error || 'Falha ao se inscrever no evento')
        }
        
        // Atualizar o evento na lista
        const updatedEvent = await response.json()
        set((state) => ({
          events: state.events.map(event => 
            event.id === eventId ? { ...event, ...updatedEvent } : event
          ),
          loading: false
        }))
        
        toast.success('Inscrição realizada com sucesso!')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao se inscrever: ${errorMessage}`)
        return false
      }
    },
    
    cancelRegistration: async (eventId) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${eventId}/register`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha ao cancelar inscrição')
        }
        
        // Atualizar o evento na lista
        const updatedEvent = await response.json()
        set((state) => ({
          events: state.events.map(event => 
            event.id === eventId ? { ...event, ...updatedEvent } : event
          ),
          loading: false
        }))
        
        toast.success('Inscrição cancelada com sucesso!')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao cancelar inscrição: ${errorMessage}`)
        return false
      }
    },
    
    approveRegistration: async (eventId, userId) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${eventId}/attendees`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, action: 'approve' })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha ao aprovar inscrição')
        }
        
        set({ loading: false })
        toast.success('Inscrição aprovada com sucesso!')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao aprovar inscrição: ${errorMessage}`)
        return false
      }
    },
    
    rejectRegistration: async (eventId, userId) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${eventId}/attendees`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, action: 'reject' })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha ao rejeitar inscrição')
        }
        
        set({ loading: false })
        toast.success('Inscrição rejeitada com sucesso!')
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error(`Erro ao rejeitar inscrição: ${errorMessage}`)
        return false
      }
    },
    
    fetchEventAttendees: async (eventId) => {
      set({ loading: true, error: null })
      
      try {
        const response = await fetch(`/api/events/${eventId}/attendees`)
        
        if (!response.ok) {
          throw new Error('Falha ao buscar participantes')
        }
        
        const attendees: EventRegistration[] = await response.json()
        
        set({ loading: false })
        return attendees
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        set({ error: errorMessage, loading: false })
        toast.error('Erro ao carregar participantes')
        return []
      }
    }
  }),
  {
    name: 'events-store'
  }
))
