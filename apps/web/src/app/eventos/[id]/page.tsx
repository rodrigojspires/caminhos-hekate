'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit,
  Trash2,
  ExternalLink,
  ArrowLeft,
  XCircle,
  UserPlus,
  UserMinus,
  Wifi,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEventsStore } from '@/stores/eventsStore';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function EventDetailsPage() {
  const params = useParams();
  const rawEventId = params?.id as string;
  const baseEventId = rawEventId?.replace(/-r\d+$/, '');
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  useEffect(() => {
    if (baseEventId) {
      fetchEventById(baseEventId);
    }
  }, [baseEventId, fetchEventById]);

  const loadAttendees = async () => {
    if (!baseEventId) return;
    setAttendeesLoading(true);
    try {
      const res = await fetch(`/api/events/${baseEventId}/attendees?limit=100`);
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
  }, [baseEventId]);

  const handleRegister = async () => {
    if (!selectedEvent) return;

    if (selectedEvent.accessType === 'PAID') {
      window.location.href = `/checkout?eventId=${selectedEvent.id}`;
      return;
    }
    
    setIsRegistering(true);
    try {
      const occurrenceStart = searchParams?.get('occurrenceStart');
      const occurrenceId = searchParams?.get('occurrenceId');
      await registerForEvent(selectedEvent.id, {
        recurrenceInstanceStart: occurrenceStart || undefined,
        recurrenceInstanceId: occurrenceId || undefined
      });
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

  const occurrenceStart = useMemo(() => {
    const value = searchParams?.get('occurrenceStart');
    return value ? new Date(value) : null;
  }, [searchParams]);

  const occurrenceEnd = useMemo(() => {
    const value = searchParams?.get('occurrenceEnd');
    return value ? new Date(value) : null;
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
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
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Evento não encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
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

  const displayStartDate = occurrenceStart || new Date(selectedEvent.startDate);
  const displayEndDate = occurrenceEnd || new Date(selectedEvent.endDate);

  const isEventPast = displayEndDate < new Date();
  const isUserRegistered = (selectedEvent as any).registrations?.some(
    (reg: any) => reg.status === 'CONFIRMED' || reg.status === 'REGISTERED'
  );
  const confirmedCount = (selectedEvent as any).registrations?.filter((reg: any) => reg.status === 'CONFIRMED').length ?? 0;
  const maxAttendeesValue = typeof selectedEvent.maxAttendees === 'number' ? selectedEvent.maxAttendees : null;
  const isEventFull = maxAttendeesValue !== null && maxAttendeesValue > 0 && confirmedCount >= maxAttendeesValue;
  const isCreator = session?.user?.id && selectedEvent.createdBy === session.user.id;
  const isPaid = selectedEvent.accessType === 'PAID';
  const isTier = selectedEvent.accessType === 'TIER';

  const formatPrice = (value?: number | string | null) => {
    if (value === undefined || value === null) return 'Gratuito';
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    if (!parsed || parsed === 0) return 'Gratuito';
    return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const typeLabels: Record<string, string> = {
    WEBINAR: 'Webinar',
    WORKSHOP: 'Workshop',
    COURSE: 'Curso',
    MEETING: 'Reunião',
    COMMUNITY: 'Comunidade',
    CONFERENCE: 'Conferência',
    NETWORKING: 'Networking',
    TRAINING: 'Treinamento'
  };

  const modeLabels: Record<string, string> = {
    ONLINE: 'Online',
    IN_PERSON: 'Presencial',
    HYBRID: 'Híbrido'
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Rascunho',
    PUBLISHED: 'Publicado',
    CANCELED: 'Cancelado',
    COMPLETED: 'Finalizado'
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                  {typeLabels[selectedEvent.type] || selectedEvent.type}
                </Badge>
                <Badge 
                  variant={selectedEvent.status === 'PUBLISHED' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {statusLabels[selectedEvent.status] || selectedEvent.status}
                </Badge>
                <Badge variant="secondary" className="text-sm gap-1">
                  {selectedEvent.mode === 'IN_PERSON' ? <MapPin className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                  {modeLabels[selectedEvent.mode] || selectedEvent.mode}
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

              <h1 className="text-4xl font-bold mb-4">
                {selectedEvent.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>
                    {displayStartDate.toLocaleDateString('pt-BR', {
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
                    {displayStartDate.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' - '}
                    {displayEndDate.toLocaleTimeString('pt-BR', {
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
                    {maxAttendeesValue ? ` / ${maxAttendeesValue}` : ''}
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
                      variant={isEventFull ? 'outline' : 'default'}
                      className="flex items-center gap-2"
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
                  <p className="text-muted-foreground leading-relaxed">
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
                    <code className="flex-1 p-3 bg-muted text-foreground rounded-md text-sm break-all border border-border">
                      {selectedEvent.virtualLink}
                    </code>
                    {isUserRegistered && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedEvent.virtualLink, '_blank')}
                      >
                        Abrir
                      </Button>
                    )}
                  </div>
                  {!isUserRegistered && (
                    <p className="text-xs text-muted-foreground mt-2">
                      O link fica disponível após a inscrição.
                    </p>
                  )}
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
                            <p className="text-xs text-muted-foreground truncate">
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
                <CardTitle>Resumo do Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{typeLabels[selectedEvent.type] || selectedEvent.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acesso:</span>
                  <span>
                    {selectedEvent.accessType === 'PAID'
                      ? 'Pago'
                      : selectedEvent.accessType === 'TIER'
                        ? 'Por tier'
                        : 'Gratuito'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formato:</span>
                  <span>{modeLabels[selectedEvent.mode] || selectedEvent.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vagas:</span>
                  <span>{maxAttendeesValue ? `${maxAttendeesValue}` : 'Ilimitado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timezone:</span>
                  <span>{selectedEvent.timezone}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
