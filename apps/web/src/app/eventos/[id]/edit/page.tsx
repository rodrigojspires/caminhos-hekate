'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useEventsStore } from '@/stores/eventsStore';
import { EventType, EventStatus, UpdateEventRequest } from '@/types/events';
import { toast } from 'sonner';

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  virtualLink: string;
  type: EventType;
  status: EventStatus;
  maxAttendees: number | null;
  isPublic: boolean;
  requiresApproval: boolean;
  timezone: string;
  tags: string[];
}

export default function EditEventPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();

  const {
    selectedEvent,
    loading,
    error,
    fetchEventById,
    updateEvent
  } = useEventsStore();

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    virtualLink: '',
    type: EventType.MEETING,
    status: EventStatus.DRAFT,
    maxAttendees: null,
    isPublic: true,
    requiresApproval: false,
    timezone: 'America/Sao_Paulo',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId);
    }
  }, [eventId, fetchEventById]);

  useEffect(() => {
    if (selectedEvent) {
      setFormData({
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        startDate: new Date(selectedEvent.startDate).toISOString().slice(0, 16),
        endDate: new Date(selectedEvent.endDate).toISOString().slice(0, 16),
        location: selectedEvent.location || '',
        virtualLink: selectedEvent.virtualLink || '',
        type: selectedEvent.type,
        status: selectedEvent.status,
        maxAttendees: selectedEvent.maxAttendees ?? null,
        isPublic: selectedEvent.isPublic,
        requiresApproval: selectedEvent.requiresApproval,
        timezone: selectedEvent.timezone,
        tags: selectedEvent.tags || []
      });
    }
  }, [selectedEvent]);

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent) return;

    // Validation
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('Data de início deve ser anterior à data de fim');
      return;
    }

    setIsSubmitting(true);
    try {
      const eventData: UpdateEventRequest = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        status: formData.status,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        location: formData.location || undefined,
        virtualLink: formData.virtualLink || undefined,
        maxAttendees: formData.maxAttendees ?? undefined,
        isPublic: formData.isPublic,
        requiresApproval: formData.requiresApproval,
        timezone: formData.timezone,
        tags: formData.tags.length ? formData.tags : undefined,
      };

      await updateEvent(selectedEvent.id, eventData);
      toast.success('Evento atualizado com sucesso!');
      router.push(`/eventos/${selectedEvent.id}`);
    } catch (error) {
      toast.error('Erro ao atualizar evento');
    } finally {
      setIsSubmitting(false);
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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Editar Evento
              </h1>
              <p className="text-gray-600">
                Atualize as informações do seu evento
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Digite o título do evento"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Descreva o evento..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Tipo de Evento</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleInputChange('type', value as EventType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEBINAR">Webinar</SelectItem>
                          <SelectItem value="WORKSHOP">Workshop</SelectItem>
                          <SelectItem value="COURSE">Curso</SelectItem>
                          <SelectItem value="MEETING">Reunião</SelectItem>
                          <SelectItem value="COMMUNITY">Comunidade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange('status', value as EventStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Rascunho</SelectItem>
                          <SelectItem value="PUBLISHED">Publicado</SelectItem>
                          <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Date and Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Data e Horário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Data e Hora de Início *</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="endDate">Data e Hora de Fim *</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => handleInputChange('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tóquio (GMT+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">Local Físico</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Endereço do evento (opcional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="virtualLink">Link Virtual</Label>
                    <Input
                      id="virtualLink"
                      value={formData.virtualLink}
                      onChange={(e) => handleInputChange('virtualLink', e.target.value)}
                      placeholder="https://meet.google.com/... (opcional)"
                      type="url"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Adicionar tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      Adicionar
                    </Button>
                  </div>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Settings Sidebar */}
            <div className="space-y-6">
              {/* Event Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Configurações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="maxAttendees">Máximo de Participantes</Label>
                    <Input
                      id="maxAttendees"
                      type="number"
                      value={formData.maxAttendees || ''}
                      onChange={(e) => handleInputChange('maxAttendees', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ilimitado"
                      min="1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPublic">Evento Público</Label>
                    <Switch
                      id="isPublic"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="requiresApproval">Requer Aprovação</Label>
                    <Switch
                      id="requiresApproval"
                      checked={formData.requiresApproval}
                      onCheckedChange={(checked) => handleInputChange('requiresApproval', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Salvando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Salvar Alterações
                        </div>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}