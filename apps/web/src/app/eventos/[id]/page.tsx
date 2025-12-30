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
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const accessToken = searchParams?.get('access') || undefined;

  const {
    selectedEvent,
    loading,
    error,
    fetchEventById,
    registerForEvent,
    cancelRegistration,
    deleteEvent,
    updateEvent
  } = useEventsStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [recordingLinkInput, setRecordingLinkInput] = useState('');
  const [recordingSaving, setRecordingSaving] = useState(false);
  const [recordingsModalOpen, setRecordingsModalOpen] = useState(false);
  const [occurrenceList, setOccurrenceList] = useState<Array<{
    id: string;
    start: Date;
    end: Date;
    recordingLink: string;
  }>>([]);
  const [occurrenceLoading, setOccurrenceLoading] = useState(false);
  const [occurrenceSavingId, setOccurrenceSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (baseEventId) {
      fetchEventById(baseEventId, { accessToken });
    }
  }, [baseEventId, accessToken, fetchEventById]);

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

  useEffect(() => {
    if (!selectedEvent) return;
    const instanceId = searchParams?.get('occurrenceId') || selectedEvent.id;
    const metadata = (selectedEvent as any).metadata as Record<string, any> | undefined;
    const recordingLinks = metadata?.recordingLinks || {};
    const resolvedRecording = recordingLinks[instanceId] || (selectedEvent as any).recordingLink || '';
    setRecordingLinkInput(resolvedRecording);
  }, [selectedEvent, searchParams]);

  useEffect(() => {
    const loadOccurrences = async () => {
      if (!recordingsModalOpen || !selectedEvent) return;
      const hasRecurring = Array.isArray((selectedEvent as any).recurringEvents) && (selectedEvent as any).recurringEvents.length > 0;
      if (!hasRecurring) return;

      setOccurrenceLoading(true);
      try {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        const res = await fetch(`/api/calendar?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Falha ao carregar ocorrências');
        }
        const payload = await res.json();
        const events = Array.isArray(payload) ? payload : payload?.events || [];
        const baseId = selectedEvent.id;
        const metadata = (selectedEvent as any).metadata as Record<string, any> | undefined;
        const recordingLinks = metadata?.recordingLinks || {};

        const occurrences = events
          .filter((event: any) => {
            const eventBaseId = String(event.id).replace(/-r\d+$/, '');
            return eventBaseId === baseId;
          })
          .map((event: any) => {
            const occurrenceId = event.id;
            const fallbackLink = occurrenceId === baseId ? (selectedEvent as any).recordingLink || '' : '';
            return {
              id: occurrenceId,
              start: new Date(event.start),
              end: new Date(event.end),
              recordingLink: recordingLinks[occurrenceId] || fallbackLink
            };
          })
          .sort((a: any, b: any) => a.start.getTime() - b.start.getTime());

        setOccurrenceList(occurrences);
      } catch (e) {
        console.error('Erro ao carregar ocorrências', e);
        toast.error('Erro ao carregar ocorrências');
      } finally {
        setOccurrenceLoading(false);
      }
    };

    loadOccurrences();
  }, [recordingsModalOpen, selectedEvent]);

  const handleRegister = async () => {
    if (!selectedEvent) return;
    
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
      const occurrenceId = searchParams?.get('occurrenceId');
      await cancelRegistration(selectedEvent.id, {
        recurrenceInstanceId: occurrenceId || selectedEvent.id
      });
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

  const handleSaveRecordingLink = async () => {
    if (!selectedEvent) return;
    const trimmed = recordingLinkInput.trim();
    if (!trimmed) {
      toast.error('Informe o link da gravação');
      return;
    }
    const occurrenceIdParam = searchParams?.get('occurrenceId');
    setRecordingSaving(true);
    await updateEvent(selectedEvent.id, {
      recordingLink: trimmed,
      recurrenceInstanceId: occurrenceIdParam || undefined
    });
    setRecordingSaving(false);
  };

  const handleSaveOccurrenceRecording = async (occurrenceId: string, value: string) => {
    if (!selectedEvent) return;
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error('Informe o link da gravação');
      return;
    }
    setOccurrenceSavingId(occurrenceId);
    await updateEvent(selectedEvent.id, {
      recordingLink: trimmed,
      recurrenceInstanceId: occurrenceId === selectedEvent.id ? undefined : occurrenceId
    });
    setOccurrenceList((prev) =>
      prev.map((occ) => (occ.id === occurrenceId ? { ...occ, recordingLink: trimmed } : occ))
    );
    setOccurrenceSavingId(null);
  };

  const occurrenceStart = useMemo(() => {
    const value = searchParams?.get('occurrenceStart');
    return value ? new Date(value) : null;
  }, [searchParams]);

  const occurrenceEnd = useMemo(() => {
    const value = searchParams?.get('occurrenceEnd');
    return value ? new Date(value) : null;
  }, [searchParams]);

  const attendeesForOccurrence = useMemo(() => {
    const occurrenceId = searchParams?.get('occurrenceId');
    if (!occurrenceId) return attendees;
    return attendees.filter((registration: any) => registration.metadata?.recurrenceInstanceId === occurrenceId);
  }, [attendees, searchParams]);

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
  const occurrenceId = searchParams?.get('occurrenceId');
  const registrations = (selectedEvent as any).registrations || [];
  const registrationsForOccurrence = occurrenceId
    ? registrations.filter((reg: any) => reg.metadata?.recurrenceInstanceId === occurrenceId)
    : registrations;
  const isUserRegistered = registrationsForOccurrence.some(
    (reg: any) => reg.status === 'CONFIRMED' || reg.status === 'REGISTERED'
  );
  const confirmedCount = registrationsForOccurrence.filter((reg: any) => reg.status === 'CONFIRMED').length ?? 0;
  const maxAttendeesValue = typeof selectedEvent.maxAttendees === 'number' ? selectedEvent.maxAttendees : null;
  const isEventFull = maxAttendeesValue !== null && maxAttendeesValue > 0 && confirmedCount >= maxAttendeesValue;
  const isCreator = session?.user?.id && selectedEvent.createdBy === session.user.id;
  const isPaid = selectedEvent.accessType === 'PAID';
  const hasTierAccess = (selectedEvent.freeTiers?.length ?? 0) > 0 || selectedEvent.accessType === 'TIER';
  const recordingLinks = (selectedEvent as any).metadata?.recordingLinks || {};
  const recordingLinkForOccurrence = occurrenceId
    ? recordingLinks[occurrenceId]
    : (selectedEvent as any).recordingLink;
  const canViewRecordingLink = Boolean(recordingLinkForOccurrence) && (isUserRegistered || isCreator);
  const canManageRecording = isCreator && (selectedEvent.mode === 'ONLINE' || selectedEvent.mode === 'HYBRID');
  const hasRecurringSeries = Array.isArray((selectedEvent as any).recurringEvents) && (selectedEvent as any).recurringEvents.length > 0;

  const formatPrice = (value?: number | string | null) => {
    if (value === undefined || value === null) return 'Gratuito';
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    if (!parsed || parsed === 0) return 'Gratuito';
    return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const typeLabels: Record<string, string> = {
    WEBINAR: 'Ritual',
    WORKSHOP: 'Workshop',
    COURSE: 'Curso',
    MEETING: 'Terapia',
    COMMUNITY: 'Ritual',
    CONFERENCE: 'Ritual',
    NETWORKING: 'Ritual',
    TRAINING: 'Workshop'
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
                  {isPaid
                    ? `${formatPrice((selectedEvent as any).price ?? selectedEvent.price)}${hasTierAccess ? ' ou incluído no plano' : ''}`
                    : hasTierAccess
                      ? 'Incluído no plano'
                      : 'Gratuito'}
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
                    {displayStartDate.toDateString() !== displayEndDate.toDateString() && (
                      <>
                        {' '}—{' '}
                        {displayEndDate.toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </>
                    )}
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
                      {isEventFull ? 'Evento Lotado' : isPaid && !hasTierAccess ? 'Ir para o checkout' : 'Inscrever-se'}
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
                  {hasRecurringSeries && (
                    <Button
                      variant="outline"
                      onClick={() => setRecordingsModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Gravações por ocorrência
                    </Button>
                  )}
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

        <div className="space-y-8">
          {/* Main Content */}
          <div className="space-y-8">
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
            {selectedEvent.virtualLink && isUserRegistered && (
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

            {/* Recording Link */}
            {canViewRecordingLink && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Link da Gravação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 p-3 bg-muted text-foreground rounded-md text-sm break-all border border-border">
                      {recordingLinkForOccurrence}
                    </code>
                    <Button
                      variant="outline"
                      onClick={() => window.open(recordingLinkForOccurrence, '_blank')}
                    >
                      Abrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {canManageRecording && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Gerenciar Gravação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {occurrenceId ? 'Link da gravação desta ocorrência' : 'Link da gravação'}
                    </label>
                    <Input
                      value={recordingLinkInput}
                      onChange={(e) => setRecordingLinkInput(e.target.value)}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleSaveRecordingLink} disabled={recordingSaving}>
                    {recordingSaving ? 'Salvando...' : 'Salvar gravação'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasRecurringSeries && canManageRecording && (
              <Dialog open={recordingsModalOpen} onOpenChange={setRecordingsModalOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Gravações por ocorrência</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-4">
                    {occurrenceLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Carregando ocorrências...</div>
                    ) : (
                      <div className="space-y-4">
                        {occurrenceList.map((occurrence) => (
                          <div key={occurrence.id} className="rounded-lg border border-border p-4 space-y-3">
                            <div className="text-sm text-muted-foreground">
                              {occurrence.start.toLocaleDateString('pt-BR')} • {occurrence.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <Input
                              value={occurrence.recordingLink}
                              onChange={(e) => {
                                const nextValue = e.target.value;
                                setOccurrenceList((prev) =>
                                  prev.map((item) =>
                                    item.id === occurrence.id ? { ...item, recordingLink: nextValue } : item
                                  )
                                );
                              }}
                              placeholder="https://..."
                            />
                            <div className="flex justify-end">
                              <Button
                                onClick={() => handleSaveOccurrenceRecording(occurrence.id, occurrence.recordingLink)}
                                disabled={occurrenceSavingId === occurrence.id}
                              >
                                {occurrenceSavingId === occurrence.id ? 'Salvando...' : 'Salvar gravação'}
                              </Button>
                            </div>
                          </div>
                        ))}
                        {!occurrenceList.length && (
                          <div className="py-8 text-center text-muted-foreground">Nenhuma ocorrência encontrada.</div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
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

          </div>
        </div>
      </div>
    </div>
  );
}
