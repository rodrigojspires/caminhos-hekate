'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Search, Grid, List, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as EventsCalendar } from '@/components/events/Calendar';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { CalendarFilters } from '@/components/events/CalendarFilters';
import { useEventsStore } from '@/stores/eventsStore';
import { EventFilters } from '@/types/events';

export default function EventosPage() {
  const {
    events,
    loading,
    error,
    filters,
    fetchEvents,
    setFilters,
  } = useEventsStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [tabValue, setTabValue] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, filters]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query });
  };

  const handleFiltersChange = (newFilters: Partial<EventFilters>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const filteredEvents = events.filter(event => {
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const upcomingEvents = filteredEvents.filter(event => 
    new Date(event.start) > new Date()
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Eventos & Calendário
              </h1>
              <p className="text-lg text-gray-600">
                Descubra workshops, webinars e encontros da comunidade
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Criar Evento
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar eventos..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-8">
            <CalendarFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total de Eventos</p>
                  <p className="text-3xl font-bold">{events.length}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Próximos Eventos</p>
                  <p className="text-3xl font-bold">{upcomingEvents.length}</p>
                </div>
                <Plus className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Meus Eventos</p>
                  <p className="text-3xl font-bold">
                    {/* Ajuste conforme houver informação de registro do usuário */}
                    {events.length}
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={tabValue} onValueChange={(value) => setTabValue(value as 'calendar' | 'list')} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>

            {tabValue === 'list' && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <EventsCalendar
                  defaultView="month"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : error ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-red-600">{error}</p>
                </CardContent>
              </Card>
            ) : filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum evento encontrado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Não há eventos que correspondam aos seus filtros.
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    Criar Primeiro Evento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Event Modal */}
        {showCreateModal && (
          <CreateEventModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
          />
        )}
      </div>
    </div>
  );
}