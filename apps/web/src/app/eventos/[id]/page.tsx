'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit,
  Trash2,
  ExternalLink,
  Bell,
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  Wifi,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventReminders } from '@/components/events/EventReminders';
import { CalendarIntegrations } from '@/components/events/CalendarIntegrations';
import { useEventsStore } from '@/stores/eventsStore';
import { CalendarEvent } from '@/types/events';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const {
    selectedEvent,
    loading,
    error,
    fetchEventById,
    registerForEvent,
    cancelRegistration,
    deleteEvent
  } = useEventsStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId);
    }
  }, [eventId, fetchEventById]);

  const loadAttendees = async () => {
    if (!eventId) return;
    setAttendeesLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees?limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setAttendees(data.attendees || []);
    } catch (e) {
      console.error('Erro ao carregar inscritos do evento', e);
    } finally {
      setAttendeesLoading(false);
    }
  };

  useEffect(() => {
    loadAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleRegister = async () => {
    if (!selectedEvent) return;

    if (selectedEvent.accessType === 'PAID') {
      window.location.href = `/checkout?eventId=${selectedEvent.id}`;
      return;
    }
    
    setIsRegistering(true);
    try {
      await registerForEvent(selectedEvent.id);
      toast.success('Inscrição realizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao se inscrever no evento');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!selectedEvent) return;
    
    try {
      await cancelRegistration(selectedEvent.id);
      toast.success('Inscrição cancelada com sucesso!');
    } catch (error) {
      toast.error('Erro ao cancelar inscrição');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await deleteEvent(selectedEvent.id);
        toast.success('Evento excluído com sucesso!');
        router.push('/eventos');
      } catch (error) {
        toast.error('Erro ao excluir evento');
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedEvent?.title,
          text: selectedEvent?.description,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !selectedEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Evento não encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                {error || 'O evento que você está procurando não existe ou foi removido.'}
              </p>
              <Button onClick={() => router.push('/eventos')}>
                Voltar aos Eventos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Build CalendarEvent for integrations from selectedEvent (full Event)
  const calendarEventForIntegration: CalendarEvent = {
    id: selectedEvent.id,
    title: selectedEvent.title,
    start: new Date(selectedEvent.startDate),
    end: new Date(selectedEvent.endDate),
    type: selectedEvent.type as any,
    status: selectedEvent.status as any,
    location: selectedEvent.location,
    virtualLink: selectedEvent.virtualLink,
    description: selectedEvent.description,
    attendeeCount: (selectedEvent as any).registrations
      ? (selectedEvent as any).registrations.filter((reg: any) => reg.status === 'CONFIRMED').length
      : (selectedEvent as any).attendeeCount ?? 0,
    maxAttendees: selectedEvent.maxAttendees
  };

  const isEventPast = new Date(selectedEvent.endDate) < new Date();
  const isUserRegistered = (selectedEvent as any).registrations?.some(
    (reg: any) => reg.status === 'CONFIRMED' || reg.status === 'REGISTERED'
  );
  const confirmedCount = (selectedEvent as any).registrations?.filter((reg: any) => reg.status === 'CONFIRMED').length ?? 0;
  const isEventFull = selectedEvent.maxAttendees !== undefined && confirmedCount >= selectedEvent.maxAttendees;
  const isCreator = session?.user?.id && selectedEvent.createdBy === session.user.id;
  const isPaid = selectedEvent.accessType === 'PAID';
  const isTier = selectedEvent.accessType === 'TIER';

  const formatPrice = (value?: number | string | null) => {
    if (value === undefined || value === null) return 'Gratuito';
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    if (!parsed || parsed === 0) return 'Gratuito';
    return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="text-sm">
                  {selectedEvent.type}
                </Badge>
                <Badge 
                  variant={selectedEvent.status === 'PUBLISHED' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {selectedEvent.status}
                </Badge>
                <Badge variant="secondary" className="text-sm gap-1">
                  {selectedEvent.mode === 'IN_PERSON' ? <MapPin className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                  {selectedEvent.mode === 'IN_PERSON' ? 'Presencial' : selectedEvent.mode === 'HYBRID' ? 'Híbrido' : 'Online'}
                </Badge>
                <Badge variant={isPaid ? 'outline' : 'default'} className="text-sm gap-1">
                  <CreditCard className="h-3 w-3" />
                  {isPaid ? formatPrice((selectedEvent as any).price ?? selectedEvent.price) : isTier ? 'Incluído no plano' : 'Gratuito'}
                </Badge>
                {isEventPast && (
                  <Badge variant="destructive" className="text-sm">
                    Finalizado
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {selectedEvent.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>
                    {new Date(selectedEvent.startDate).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>
                    {new Date(selectedEvent.startDate).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' - '}
                    {new Date(selectedEvent.endDate).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>
                    {(selectedEvent as any).registrations?.filter((reg: any) => reg.status === 'CONFIRMED').length || 0}
                    {selectedEvent.maxAttendees && ` / ${selectedEvent.maxAttendees}`}
                    {' participantes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!isEventPast && (
                <>
                  {isUserRegistered ? (
                    <Button
                      variant="outline"
                      onClick={handleCancelRegistration}
                      className="flex items-center gap-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      Cancelar Inscrição
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRegister}
                      disabled={isRegistering || isEventFull}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {isRegistering ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {isEventFull ? 'Evento Lotado' : isPaid ? 'Ir para o checkout' : 'Inscrever-se'}
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>

              {isCreator && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/eventos/${selectedEvent.id}/edit`)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteEvent}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Sobre o Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {selectedEvent.description || 'Nenhuma descrição disponível.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Virtual Link */}
            {selectedEvent.virtualLink && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Link do Evento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 p-3 bg-gray-100 rounded-md text-sm">
                      {selectedEvent.virtualLink}
                    </code>
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedEvent.virtualLink, '_blank')}
                    >
                      Abrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {selectedEvent.tags && selectedEvent.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            {(isCreator || attendees.length > 0) && (
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Participantes</CardTitle>
                  {attendeesLoading && <span className="text-xs text-muted-foreground">Carregando...</span>}
                </CardHeader>
                <CardContent>
                  {attendees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum inscrito ainda.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {attendees.map((registration: any) => (
                        <div key={registration.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={registration.user?.image} alt={registration.user?.name || 'Usuário'} />
                            <AvatarFallback>
                              {registration.user?.name?.charAt(0) || registration.guestName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {registration.user?.name || registration.guestName || 'Usuário'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {registration.user?.email || registration.guestEmail}
                            </p>
                            {(registration.metadata?.recurrenceInstanceStart ||
                              registration.metadata?.recurrenceInstanceId) && (
                              <p className="text-[11px] text-muted-foreground">
                                Recorrência:{' '}
                                {registration.metadata?.recurrenceInstanceStart
                                  ? new Date(registration.metadata.recurrenceInstanceStart).toLocaleString('pt-BR')
                                  : registration.metadata?.recurrenceInstanceId}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground">{registration.status}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(registration.registeredAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={(selectedEvent as any).creator?.image} alt={(selectedEvent as any).creator?.name || 'Criador do evento'} />
                    <AvatarFallback>
                      {(selectedEvent as any).creator?.name?.charAt(0) || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Organizador</p>
                    <p className="text-sm text-gray-600">
                      {(selectedEvent as any).creator?.name || 'Organizador'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Criado em:</span>
                    <span>
                      {new Date(selectedEvent.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timezone:</span>
                    <span>{selectedEvent.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Público:</span>
                    <span>{selectedEvent.isPublic ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requer Aprovação:</span>
                    <span>{selectedEvent.requiresApproval ? 'Sim' : 'Não'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowReminders(true)}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Gerenciar Lembretes
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowIntegrations(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Calendário
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reminders Modal */}
      {showReminders && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Lembretes do Evento</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowReminders(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              <EventReminders eventId={selectedEvent.id} eventTitle={selectedEvent.title} eventStartDate={new Date(selectedEvent.startDate)} />
            </div>
          </div>
        </div>
      )}

      {/* Calendar Integrations Modal */}
      {showIntegrations && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Exportar para Calendário</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowIntegrations(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              <CalendarIntegrations event={calendarEventForIntegration} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
