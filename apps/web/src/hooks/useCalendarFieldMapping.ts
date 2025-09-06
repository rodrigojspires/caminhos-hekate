'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface FieldMapping {
  id?: string;
  integrationId: string;
  provider: 'google' | 'outlook';
  mappings: FieldMappingRule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FieldMappingRule {
  id: string;
  hekateField: string;
  externalField: string;
  isRequired: boolean;
  transformation?: 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'truncate' | 'custom';
  customTransformation?: string;
  defaultValue?: string;
}

const defaultGoogleMappings: FieldMappingRule[] = [
  {
    id: '1',
    hekateField: 'title',
    externalField: 'summary',
    isRequired: true,
    transformation: 'none'
  },
  {
    id: '2',
    hekateField: 'description',
    externalField: 'description',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '3',
    hekateField: 'startTime',
    externalField: 'start.dateTime',
    isRequired: true,
    transformation: 'none'
  },
  {
    id: '4',
    hekateField: 'endTime',
    externalField: 'end.dateTime',
    isRequired: true,
    transformation: 'none'
  },
  {
    id: '5',
    hekateField: 'location',
    externalField: 'location',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '6',
    hekateField: 'isAllDay',
    externalField: 'start.date',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '7',
    hekateField: 'attendees',
    externalField: 'attendees',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '8',
    hekateField: 'recurrence',
    externalField: 'recurrence',
    isRequired: false,
    transformation: 'none'
  }
];

const defaultOutlookMappings: FieldMappingRule[] = [
  {
    id: '1',
    hekateField: 'title',
    externalField: 'subject',
    isRequired: true,
    transformation: 'none'
  },
  {
    id: '2',
    hekateField: 'description',
    externalField: 'body.content',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '3',
    hekateField: 'startTime',
    externalField: 'start.dateTime',
    isRequired: true,
    transformation: 'none'
  },
  {
    id: '4',
    hekateField: 'endTime',
    externalField: 'end.dateTime',
    isRequired: true,
    transformation: 'none'
  },
  {
    id: '5',
    hekateField: 'location',
    externalField: 'location.displayName',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '6',
    hekateField: 'isAllDay',
    externalField: 'isAllDay',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '7',
    hekateField: 'attendees',
    externalField: 'attendees',
    isRequired: false,
    transformation: 'none'
  },
  {
    id: '8',
    hekateField: 'recurrence',
    externalField: 'recurrence',
    isRequired: false,
    transformation: 'none'
  }
];

const hekateFields = [
  { value: 'title', label: 'Título' },
  { value: 'description', label: 'Descrição' },
  { value: 'startTime', label: 'Data/Hora de Início' },
  { value: 'endTime', label: 'Data/Hora de Fim' },
  { value: 'location', label: 'Local' },
  { value: 'isAllDay', label: 'Dia Inteiro' },
  { value: 'attendees', label: 'Participantes' },
  { value: 'recurrence', label: 'Recorrência' },
  { value: 'category', label: 'Categoria' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'status', label: 'Status' },
  { value: 'visibility', label: 'Visibilidade' }
];

const googleFields = [
  { value: 'summary', label: 'Summary' },
  { value: 'description', label: 'Description' },
  { value: 'start.dateTime', label: 'Start DateTime' },
  { value: 'end.dateTime', label: 'End DateTime' },
  { value: 'start.date', label: 'Start Date (All Day)' },
  { value: 'end.date', label: 'End Date (All Day)' },
  { value: 'location', label: 'Location' },
  { value: 'attendees', label: 'Attendees' },
  { value: 'recurrence', label: 'Recurrence' },
  { value: 'colorId', label: 'Color ID' },
  { value: 'visibility', label: 'Visibility' },
  { value: 'status', label: 'Status' }
];

const outlookFields = [
  { value: 'subject', label: 'Subject' },
  { value: 'body.content', label: 'Body Content' },
  { value: 'start.dateTime', label: 'Start DateTime' },
  { value: 'end.dateTime', label: 'End DateTime' },
  { value: 'isAllDay', label: 'Is All Day' },
  { value: 'location.displayName', label: 'Location Display Name' },
  { value: 'attendees', label: 'Attendees' },
  { value: 'recurrence', label: 'Recurrence' },
  { value: 'categories', label: 'Categories' },
  { value: 'importance', label: 'Importance' },
  { value: 'showAs', label: 'Show As' },
  { value: 'sensitivity', label: 'Sensitivity' }
];

export function useCalendarFieldMapping(integrationId?: string, provider?: 'google' | 'outlook') {
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getDefaultMappings = useCallback((providerType: 'google' | 'outlook') => {
    return providerType === 'google' ? defaultGoogleMappings : defaultOutlookMappings;
  }, []);

  const getExternalFields = useCallback((providerType: 'google' | 'outlook') => {
    return providerType === 'google' ? googleFields : outlookFields;
  }, []);

  const fetchMapping = useCallback(async () => {
    if (!integrationId || !provider) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/field-mapping?integrationId=${integrationId}`);
      
      if (!response.ok) throw new Error('Failed to fetch field mapping');
      
      const data = await response.json();
      setMapping(data.mapping || {
        integrationId,
        provider,
        mappings: getDefaultMappings(provider)
      });
    } catch (error) {
      console.error('Error fetching field mapping:', error);
      toast.error('Erro ao carregar mapeamento de campos');
      // Set default mapping on error
      setMapping({
        integrationId,
        provider,
        mappings: getDefaultMappings(provider)
      });
    } finally {
      setLoading(false);
    }
  }, [integrationId, provider, getDefaultMappings]);

  const saveMapping = useCallback(async (newMapping: FieldMapping) => {
    if (!integrationId) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/calendar/field-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping)
      });

      if (!response.ok) throw new Error('Failed to save field mapping');
      
      const data = await response.json();
      setMapping(data.mapping);
      toast.success('Mapeamento de campos salvo com sucesso');
    } catch (error) {
      console.error('Error saving field mapping:', error);
      toast.error('Erro ao salvar mapeamento de campos');
    } finally {
      setSaving(false);
    }
  }, [integrationId]);

  const addMapping = useCallback((hekateField: string, externalField: string, isRequired = false) => {
    if (!mapping) return;
    
    const newRule: FieldMappingRule = {
      id: Date.now().toString(),
      hekateField,
      externalField,
      isRequired,
      transformation: 'none'
    };
    
    const newMapping = {
      ...mapping,
      mappings: [...mapping.mappings, newRule]
    };
    
    setMapping(newMapping);
  }, [mapping]);

  const updateMapping = useCallback((ruleId: string, updates: Partial<FieldMappingRule>) => {
    if (!mapping) return;
    
    const newMapping = {
      ...mapping,
      mappings: mapping.mappings.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    };
    
    setMapping(newMapping);
  }, [mapping]);

  const removeMapping = useCallback((ruleId: string) => {
    if (!mapping) return;
    
    const newMapping = {
      ...mapping,
      mappings: mapping.mappings.filter(rule => rule.id !== ruleId)
    };
    
    setMapping(newMapping);
  }, [mapping]);

  const resetToDefaults = useCallback(async () => {
    if (!integrationId || !provider) return;
    
    try {
      const response = await fetch('/api/calendar/field-mapping', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId })
      });

      if (!response.ok) throw new Error('Failed to reset field mapping');
      
      setMapping({
        integrationId,
        provider,
        mappings: getDefaultMappings(provider)
      });
      
      toast.success('Mapeamento restaurado para os padrões');
    } catch (error) {
      console.error('Error resetting field mapping:', error);
      toast.error('Erro ao restaurar mapeamento padrão');
    }
  }, [integrationId, provider, getDefaultMappings]);

  const validateMapping = useCallback(() => {
    if (!mapping) return { isValid: false, errors: ['Mapeamento não carregado'] };
    
    const errors: string[] = [];
    const requiredFields = mapping.mappings.filter(rule => rule.isRequired);
    const duplicateHekateFields = new Set();
    const duplicateExternalFields = new Set();
    
    // Check for required fields
    if (requiredFields.length === 0) {
      errors.push('Pelo menos um campo obrigatório deve ser mapeado');
    }
    
    // Check for duplicates
    mapping.mappings.forEach(rule => {
      if (mapping.mappings.filter(r => r.hekateField === rule.hekateField).length > 1) {
        duplicateHekateFields.add(rule.hekateField);
      }
      if (mapping.mappings.filter(r => r.externalField === rule.externalField).length > 1) {
        duplicateExternalFields.add(rule.externalField);
      }
    });
    
    if (duplicateHekateFields.size > 0) {
      errors.push(`Campos Hekate duplicados: ${Array.from(duplicateHekateFields).join(', ')}`);
    }
    
    if (duplicateExternalFields.size > 0) {
      errors.push(`Campos externos duplicados: ${Array.from(duplicateExternalFields).join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [mapping]);

  useEffect(() => {
    if (integrationId && provider) {
      fetchMapping();
    }
  }, [integrationId, provider, fetchMapping]);

  return {
    mapping,
    loading,
    saving,
    hekateFields,
    externalFields: provider ? getExternalFields(provider) : [],
    addMapping,
    updateMapping,
    removeMapping,
    saveMapping,
    resetToDefaults,
    validateMapping,
    refresh: fetchMapping
  };
}