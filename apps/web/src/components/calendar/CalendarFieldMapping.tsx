'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Settings,
  ArrowLeftRight,
  Save,
  RotateCcw,
  Info,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';

interface FieldMapping {
  id: string;
  localField: string;
  externalField: string;
  provider: 'GOOGLE' | 'OUTLOOK';
  dataType: 'string' | 'datetime' | 'boolean' | 'number' | 'array';
  isRequired: boolean;
  transformFunction?: string;
  defaultValue?: string;
  isActive: boolean;
}

interface CalendarProvider {
  id: 'GOOGLE' | 'OUTLOOK';
  name: string;
  icon: string;
  fields: {
    name: string;
    type: 'string' | 'datetime' | 'boolean' | 'number' | 'array';
    required: boolean;
    description: string;
  }[];
}

interface CalendarFieldMappingProps {
  integrationId?: string;
  provider?: 'GOOGLE' | 'OUTLOOK';
  onMappingChange?: (mappings: FieldMapping[]) => void;
}

const HEKATE_FIELDS = [
  { name: 'title', type: 'string', required: true, description: 'Título do evento' },
  { name: 'description', type: 'string', required: false, description: 'Descrição do evento' },
  { name: 'startTime', type: 'datetime', required: true, description: 'Data/hora de início' },
  { name: 'endTime', type: 'datetime', required: true, description: 'Data/hora de término' },
  { name: 'location', type: 'string', required: false, description: 'Local do evento' },
  { name: 'isAllDay', type: 'boolean', required: false, description: 'Evento de dia inteiro' },
  { name: 'isPrivate', type: 'boolean', required: false, description: 'Evento privado' },
  { name: 'attendees', type: 'array', required: false, description: 'Lista de participantes' },
  { name: 'reminders', type: 'array', required: false, description: 'Lembretes do evento' },
  { name: 'recurrence', type: 'string', required: false, description: 'Regra de recorrência' },
  { name: 'timezone', type: 'string', required: false, description: 'Fuso horário' },
  { name: 'status', type: 'string', required: false, description: 'Status do evento' },
  { name: 'visibility', type: 'string', required: false, description: 'Visibilidade do evento' },
  { name: 'color', type: 'string', required: false, description: 'Cor do evento' },
  { name: 'url', type: 'string', required: false, description: 'URL do evento' },
];

const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: 'GOOGLE',
    name: 'Google Calendar',
    icon: '🔗',
    fields: [
      { name: 'summary', type: 'string', required: true, description: 'Título do evento' },
      { name: 'description', type: 'string', required: false, description: 'Descrição do evento' },
      { name: 'start.dateTime', type: 'datetime', required: true, description: 'Data/hora de início' },
      { name: 'end.dateTime', type: 'datetime', required: true, description: 'Data/hora de término' },
      { name: 'location', type: 'string', required: false, description: 'Local do evento' },
      { name: 'start.date', type: 'datetime', required: false, description: 'Data de início (dia inteiro)' },
      { name: 'end.date', type: 'datetime', required: false, description: 'Data de término (dia inteiro)' },
      { name: 'attendees', type: 'array', required: false, description: 'Lista de participantes' },
      { name: 'reminders.useDefault', type: 'boolean', required: false, description: 'Usar lembretes padrão' },
      { name: 'reminders.overrides', type: 'array', required: false, description: 'Lembretes personalizados' },
      { name: 'recurrence', type: 'array', required: false, description: 'Regras de recorrência' },
      { name: 'start.timeZone', type: 'string', required: false, description: 'Fuso horário de início' },
      { name: 'end.timeZone', type: 'string', required: false, description: 'Fuso horário de término' },
      { name: 'status', type: 'string', required: false, description: 'Status do evento' },
      { name: 'visibility', type: 'string', required: false, description: 'Visibilidade do evento' },
      { name: 'colorId', type: 'string', required: false, description: 'ID da cor' },
      { name: 'htmlLink', type: 'string', required: false, description: 'Link do evento' },
    ],
  },
  {
    id: 'OUTLOOK',
    name: 'Outlook Calendar',
    icon: '📧',
    fields: [
      { name: 'subject', type: 'string', required: true, description: 'Título do evento' },
      { name: 'body.content', type: 'string', required: false, description: 'Descrição do evento' },
      { name: 'start.dateTime', type: 'datetime', required: true, description: 'Data/hora de início' },
      { name: 'end.dateTime', type: 'datetime', required: true, description: 'Data/hora de término' },
      { name: 'location.displayName', type: 'string', required: false, description: 'Local do evento' },
      { name: 'isAllDay', type: 'boolean', required: false, description: 'Evento de dia inteiro' },
      { name: 'sensitivity', type: 'string', required: false, description: 'Sensibilidade (privacidade)' },
      { name: 'attendees', type: 'array', required: false, description: 'Lista de participantes' },
      { name: 'reminderMinutesBeforeStart', type: 'number', required: false, description: 'Lembrete em minutos' },
      { name: 'recurrence', type: 'string', required: false, description: 'Padrão de recorrência' },
      { name: 'start.timeZone', type: 'string', required: false, description: 'Fuso horário de início' },
      { name: 'end.timeZone', type: 'string', required: false, description: 'Fuso horário de término' },
      { name: 'showAs', type: 'string', required: false, description: 'Status de disponibilidade' },
      { name: 'importance', type: 'string', required: false, description: 'Importância do evento' },
      { name: 'categories', type: 'array', required: false, description: 'Categorias do evento' },
      { name: 'webLink', type: 'string', required: false, description: 'Link do evento' },
    ],
  },
];

const DEFAULT_MAPPINGS: Record<'GOOGLE' | 'OUTLOOK', Partial<FieldMapping>[]> = {
  GOOGLE: [
    { localField: 'title', externalField: 'summary', dataType: 'string', isRequired: true },
    { localField: 'description', externalField: 'description', dataType: 'string', isRequired: false },
    { localField: 'startTime', externalField: 'start.dateTime', dataType: 'datetime', isRequired: true },
    { localField: 'endTime', externalField: 'end.dateTime', dataType: 'datetime', isRequired: true },
    { localField: 'location', externalField: 'location', dataType: 'string', isRequired: false },
    { localField: 'attendees', externalField: 'attendees', dataType: 'array', isRequired: false },
    { localField: 'timezone', externalField: 'start.timeZone', dataType: 'string', isRequired: false },
    { localField: 'status', externalField: 'status', dataType: 'string', isRequired: false },
    { localField: 'visibility', externalField: 'visibility', dataType: 'string', isRequired: false },
    { localField: 'color', externalField: 'colorId', dataType: 'string', isRequired: false },
    { localField: 'url', externalField: 'htmlLink', dataType: 'string', isRequired: false },
  ],
  OUTLOOK: [
    { localField: 'title', externalField: 'subject', dataType: 'string', isRequired: true },
    { localField: 'description', externalField: 'body.content', dataType: 'string', isRequired: false },
    { localField: 'startTime', externalField: 'start.dateTime', dataType: 'datetime', isRequired: true },
    { localField: 'endTime', externalField: 'end.dateTime', dataType: 'datetime', isRequired: true },
    { localField: 'location', externalField: 'location.displayName', dataType: 'string', isRequired: false },
    { localField: 'isAllDay', externalField: 'isAllDay', dataType: 'boolean', isRequired: false },
    { localField: 'attendees', externalField: 'attendees', dataType: 'array', isRequired: false },
    { localField: 'timezone', externalField: 'start.timeZone', dataType: 'string', isRequired: false },
    { localField: 'status', externalField: 'showAs', dataType: 'string', isRequired: false },
    { localField: 'isPrivate', externalField: 'sensitivity', dataType: 'string', isRequired: false, transformFunction: 'sensitivity === "private"' },
    { localField: 'url', externalField: 'webLink', dataType: 'string', isRequired: false },
  ],
};

export default function CalendarFieldMapping({ integrationId, provider, onMappingChange }: CalendarFieldMappingProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<'GOOGLE' | 'OUTLOOK'>(provider || 'GOOGLE');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  

  const loadDefaultMappings = useCallback(() => {
    const defaultMappings = DEFAULT_MAPPINGS[selectedProvider].map((mapping, index) => ({
      id: `default-${index}`,
      provider: selectedProvider,
      isActive: true,
      ...mapping,
    })) as FieldMapping[];
    
    setMappings(defaultMappings);
    setHasChanges(false);
  }, [selectedProvider]);

  const loadMappings = useCallback(async () => {
    if (!integrationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/calendar/integrations/${integrationId}/mappings`);
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || []);
      } else {
        loadDefaultMappings();
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      loadDefaultMappings();
    } finally {
      setLoading(false);
    }
  }, [integrationId, loadDefaultMappings]);

  useEffect(() => {
    if (integrationId) {
      loadMappings();
    } else {
      loadDefaultMappings();
    }
  }, [integrationId, selectedProvider, loadMappings, loadDefaultMappings]);

  const saveMappings = async () => {
    if (!integrationId) {
      onMappingChange?.(mappings);
      toast.success('Mapeamentos atualizados');
      setHasChanges(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/calendar/integrations/${integrationId}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });

      if (response.ok) {
        toast.success('Mapeamentos salvos com sucesso');
        setHasChanges(false);
        onMappingChange?.(mappings);
      } else {
        toast.error('Falha ao salvar mapeamentos');
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Erro ao salvar mapeamentos');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    setMappings(prev => prev.map(mapping => 
      mapping.id === id ? { ...mapping, ...updates } : mapping
    ));
    setHasChanges(true);
  };

  const addMapping = () => {
    const newMapping: FieldMapping = {
      id: `custom-${Date.now()}`,
      localField: '',
      externalField: '',
      provider: selectedProvider,
      dataType: 'string',
      isRequired: false,
      isActive: true,
    };
    
    setMappings(prev => [...prev, newMapping]);
    setHasChanges(true);
  };

  const removeMapping = (id: string) => {
    setMappings(prev => prev.filter(mapping => mapping.id !== id));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    if (confirm('Tem certeza que deseja restaurar os mapeamentos padrão? Todas as alterações serão perdidas.')) {
      loadDefaultMappings();
    }
  };

  const currentProvider = CALENDAR_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Mapeamento de Campos
          </CardTitle>
          <CardDescription>
            Configure como os campos dos eventos são mapeados entre o Hekate e o calendário externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          {!provider && (
            <div className="space-y-2">
              <Label>Provedor de Calendário</Label>
              <Select value={selectedProvider} onValueChange={(value: 'GOOGLE' | 'OUTLOOK') => setSelectedProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_PROVIDERS.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={addMapping} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Adicionar Mapeamento
              </Button>
              <Button onClick={resetToDefaults} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
                Restaurar Padrões
              </Button>
            </div>
            
            {hasChanges && (
              <Button onClick={saveMappings} disabled={loading}>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
            )}
          </div>

          <Separator />

          {/* Mappings List */}
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-3">Campo Hekate</div>
              <div className="col-span-1 text-center">↔</div>
              <div className="col-span-3">Campo {currentProvider?.name}</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-1 text-center">Obrigatório</div>
              <div className="col-span-1 text-center">Ativo</div>
              <div className="col-span-1 text-center">Ações</div>
            </div>
            
            {mappings.map((mapping) => (
              <Card key={mapping.id} className={`${mapping.isActive ? '' : 'opacity-50'}`}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Local Field */}
                    <div className="col-span-3">
                      <Select
                        value={mapping.localField}
                        onValueChange={(value) => updateMapping(mapping.id, { localField: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecionar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {HEKATE_FIELDS.map(field => (
                            <SelectItem key={field.name} value={field.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{field.name}</span>
                                {field.required && <Badge variant="secondary" className="ml-2 text-xs">Obrigatório</Badge>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Arrow */}
                    <div className="col-span-1 text-center">
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* External Field */}
                    <div className="col-span-3">
                      <Select
                        value={mapping.externalField}
                        onValueChange={(value) => updateMapping(mapping.id, { externalField: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecionar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentProvider?.fields.map(field => (
                            <SelectItem key={field.name} value={field.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{field.name}</span>
                                {field.required && <Badge variant="secondary" className="ml-2 text-xs">Obrigatório</Badge>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Data Type */}
                    <div className="col-span-2">
                      <Select
                        value={mapping.dataType}
                        onValueChange={(value: any) => updateMapping(mapping.id, { dataType: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="datetime">DateTime</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Required */}
                    <div className="col-span-1 text-center">
                      <Switch
                        checked={mapping.isRequired}
                        onCheckedChange={(checked) => updateMapping(mapping.id, { isRequired: checked })}
                      />
                    </div>

                    {/* Active */}
                    <div className="col-span-1 text-center">
                      <Switch
                        checked={mapping.isActive}
                        onCheckedChange={(checked) => updateMapping(mapping.id, { isActive: checked })}
                      />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(mapping.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Transform Function */}
                  {mapping.dataType !== 'string' || mapping.transformFunction ? (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-xs">Função de Transformação (JavaScript)</Label>
                      <Input
                        placeholder="ex: value.toUpperCase() ou value === 'private'"
                        value={mapping.transformFunction || ''}
                        onChange={(e) => updateMapping(mapping.id, { transformFunction: e.target.value })}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                  ) : null}

                  {/* Default Value */}
                  {!mapping.isRequired && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-xs">Valor Padrão</Label>
                      <Input
                        placeholder="Valor usado quando o campo estiver vazio"
                        value={mapping.defaultValue || ''}
                        onChange={(e) => updateMapping(mapping.id, { defaultValue: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {mappings.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhum mapeamento configurado. Clique em &quot;Adicionar Mapeamento&quot; para começar ou &quot;Restaurar Padrões&quot; para usar a configuração padrão.
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {mappings.some(m => m.isActive && (!m.localField || !m.externalField)) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Alguns mapeamentos ativos estão incompletos. Certifique-se de que todos os campos obrigatórios estejam preenchidos.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {!hasChanges && mappings.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Mapeamentos configurados e salvos com sucesso. {mappings.filter(m => m.isActive).length} mapeamentos ativos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
