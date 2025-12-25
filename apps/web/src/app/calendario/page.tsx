'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Settings,
  List,
  Grid3X3,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/events/Calendar';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { CalendarFilters } from '@/components/events/CalendarFilters';
import { useEventsStore } from '@/stores/eventsStore';
import SacredTimeline from '@/components/calendar/SacredTimeline';
import { CalendarEvent, EventFilters, EventType } from '@/types/events';
import { toast } from 'sonner';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarioPage() {
  const {
    events,
    loading,
    error,
    fetchEvents,
    createEvent
  } = useEventsStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    types: [],
    modes: [],
    status: [],
    tags: []
  });

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(event => {
    // Search filter (combina busca local com filtro da folha lateral)
    const combinedSearch = (searchQuery || filters.search || '').trim();
    if (combinedSearch) {
      const query = combinedSearch.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.tags?.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.types && filters.types.length > 0 && !filters.types.includes(event.type)) {
      return false;
    }

    // Mode filter
    if (filters.modes && filters.modes.length > 0 && (!event.mode || !filters.modes.includes(event.mode))) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0 && !filters.status.includes(event.status)) {
      return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(filterTag => 
        event.tags?.some(eventTag => eventTag.toLowerCase().includes(filterTag.toLowerCase()))
      );
      if (!hasMatchingTag) return false;
    }

    return true;
  });

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForCurrentView = () => {
    const now = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    switch (viewMode) {
      case 'month':
        return filteredEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= startOfMonth && eventDate <= endOfMonth;
        });
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return filteredEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= startOfWeek && eventDate <= endOfWeek;
        });
      case 'day':
        return getEventsForDate(currentDate);
      default:
        return filteredEvents;
    }
  };

  // Navegação entre períodos
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() + 7);
      }
      return newDate;
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 1);
      } else {
        newDate.setDate(prev.getDate() + 1);
      }
      return newDate;
    });
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'month':
        navigateMonth(direction);
        break;
      case 'week':
        navigateWeek(direction);
        break;
      case 'day':
        navigateDay(direction);
        break;
    }
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'month':
        return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'day':
        return `${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      default:
        return '';
    }
  };

  const exportCalendar = () => {
    // Generate ICS file for current view events
    const events = getEventsForCurrentView();
    const icsContent = generateICS(events);
    downloadICS(icsContent, `calendario-${viewMode}-${currentDate.toISOString().split('T')[0]}.ics`);
    toast.success('Calendário exportado com sucesso!');
  };

  const generateICS = (events: CalendarEvent[]) => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Caminhos de Hekate//Calendar//PT'
    ];

    events.forEach(event => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@caminhosdehecate.com`,
        `DTSTART:${new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTEND:${new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ''}`,
        event.location ? `LOCATION:${event.location}` : '',
        `STATUS:${event.status === 'PUBLISHED' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.filter(line => line).join('\r\n');
  };

  const downloadICS = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hekate-gold"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-hekate-pearl mb-2">
                Calendário Sagrado
              </h1>
              <p className="text-hekate-pearl/70">
                Sabbaths, Deipnon, Jornadas — os ciclos e ritos do Templo
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>

              <Button
                variant="outline"
                onClick={exportCalendar}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>

              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-hekate-gold text-hekate-black hover:bg-hekate-gold/90"
              >
                <Plus className="h-4 w-4" />
                Novo Evento
              </Button>
              <a href="#calendario-completo" className="btn-mystic-enhanced whitespace-nowrap">Ver calendário completo</a>
            </div>
          </div>

          {/* Sacred Timeline */}
          <div className="mt-6">
            <SacredTimeline />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6">
              <CalendarFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setShowFilters(false)}
              />
            </div>
          )}
        </div>

        {/* Calendar Navigation */}
        <Card id="calendario-completo" className="mb-6 card-mystic">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigation('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <h2 className="text-xl font-semibold text-hekate-pearl">
                  {getViewTitle()}
                </h2>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigation('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Mês
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  Dia
                </Button>
              </div>
            </div>

            {/* Calendar View */}
            <div className="min-h-[600px]">
              <CalendarComponent
                defaultView={viewMode}
                showCreateButton={false}
                showFilters={false}
                className="min-h-[600px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Events List for Current View */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Eventos - {getViewTitle()}</span>
                  <Badge variant="outline">
                    {getEventsForCurrentView().length} eventos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getEventsForCurrentView().length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhum evento encontrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Não há eventos para o período selecionado.
                    </p>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      Criar Primeiro Evento
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getEventsForCurrentView().map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => window.open(`/eventos/${event.id}`, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de Eventos</span>
                  <Badge variant="outline">{filteredEvents.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Este Mês</span>
                  <Badge variant="outline">
                    {filteredEvents.filter(event => {
                      const eventDate = new Date(event.start);
                      const now = new Date();
                      return eventDate.getMonth() === now.getMonth() && 
                             eventDate.getFullYear() === now.getFullYear();
                    }).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Próximos 7 dias</span>
                  <Badge variant="outline">
                    {filteredEvents.filter(event => {
                      const eventDate = new Date(event.start);
                      const now = new Date();
                      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return eventDate >= now && eventDate <= nextWeek;
                    }).length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredEvents
                    .filter(event => new Date(event.start) > new Date())
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => window.open(`/eventos/${event.id}`, '_blank')}
                      >
                        <h4 className="font-medium text-sm mb-1">{event.title}</h4>
                        <p className="text-xs text-gray-600">
                          {new Date(event.start).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {event.type}
                        </Badge>
                      </div>
                    ))}
                  
                  {filteredEvents.filter(event => new Date(event.start) > new Date()).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum evento próximo
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onEventCreated={(event: CalendarEvent) => {
            setShowCreateModal(false);
            toast.success('Evento criado com sucesso!');
          }}
        />
      )}
    </div>
  );
}
